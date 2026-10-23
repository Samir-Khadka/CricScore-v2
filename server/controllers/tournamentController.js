const mongoose = require("mongoose");
const Team = require("../models/Teams");
const Tournament = require("../models/Tournament");
const Match = require("../models/Match");
const Players = require("../models/Players");
const Innings = require("../models/Innings");
const BallEvents = require("../models/BallEvents");
const { pickFields, loadOwned, isOwner } = require("../services/ownership");

// Fields a scorer may change on their own tournament / team. createdBy
// and relational ids are never editable through these endpoints.
const TOURNAMENT_EDITABLE = [
  "tournament_name",
  "start_date",
  "end_date",
  "venue",
  "location",
  "locMap",
  "format",
  "organizer",
  "description",
];
const TEAM_EDITABLE = ["teamName", "teamCoach"];

async function handleCreateTournament(req, res) {
  const tournament = req.body;
  try {
    await Tournament.create({
      tournament_name: tournament.tournament_name,
      start_date: tournament.start_date,
      end_date: tournament.end_date,
      venue: tournament.venue,
      location: tournament.location,
      locMap: tournament.locFromMap || null,
      format: tournament.format,
      organizer: tournament.organizer || null,
      description: tournament.description || null,
      createdBy: req.scorer._id,
    });

    return res.status(201).json({ message: "Tournament Created Successfully" });
  } catch (error) {
    return res.status(422).json({ message: error.message || "Invalid tournament" });
  }
}

async function handleUpdateTournament(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid tournament ID format" });
  }
  try {
    const tournament = await loadOwned(
      res,
      Tournament,
      id,
      req.scorer._id,
      "Tournament"
    );
    if (!tournament) return;

    const updates = pickFields(req.body, TOURNAMENT_EDITABLE);
    // The create form posts the map link as locFromMap.
    if (req.body.locFromMap !== undefined) updates.locMap = req.body.locFromMap;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No editable fields provided" });
    }
    Object.assign(tournament, updates);
    await tournament.save();

    return res.json({
      message: "Tournament Updated Successfully",
      data: tournament,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

async function handleDeleteTournament(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Tournament ID format" });
  }
  try {
    const tournament = await loadOwned(
      res,
      Tournament,
      id,
      req.scorer._id,
      "Tournament"
    );
    if (!tournament) return;

    // Cascade: teams, squads, matches, innings and ball logs that
    // belong to this tournament go with it.
    const matches = await Match.find({ tournament_id: tournament._id }).select("_id");
    if (matches.length > 0) {
      const innings = await Innings.find({
        matchId: { $in: matches.map((m) => m._id) },
      }).select("_id");
      if (innings.length > 0) {
        await BallEvents.deleteMany({
          inning: { $in: innings.map((i) => i._id) },
        });
      }
      await Innings.deleteMany({ matchId: { $in: matches.map((m) => m._id) } });
      await Match.deleteMany({ tournament_id: tournament._id });
    }
    await Players.deleteMany({ tournamentId: tournament._id });
    await Team.deleteMany({ tournament: tournament._id });
    await tournament.deleteOne();

    return res.json({ message: "Tournament Deleted Successfully" });
  } catch (error) {
    console.error("Tournament Delete error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

async function handleShowAllTournament(req, res) {
  const scorerId = req.scorer._id;

  try {
    const scorerTournament = await Tournament.find({ createdBy: scorerId });

    if (scorerTournament.length === 0) {
      return res.status(200).json({ message: "No tournaments", data: [] });
    }

    return res
      .status(200)
      .json({ message: "Tournament fetch successful", data: scorerTournament });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching tournaments" });
  }
}

async function handleGetTourById(req, res) {
  const _id = req.params.id;

  if (!_id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      message: "Invalid tournament ID format",
    });
  }

  try {
    const tournament = await Tournament.findById(_id).populate(
      "createdBy",
      "fullName"
    );
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    return res.status(200).json({ message: "Found", data: tournament });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching tournament" });
  }
}

async function handleCreateTeam(req, res) {
  const { teamName, teamCoach } = req.body;
  const tourId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ message: "Invalid tournament ID format" });
    }
    const tournament = await Tournament.findById(tourId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    if (!isOwner(tournament, req.scorer._id)) {
      return res
        .status(403)
        .json({ message: "You can only add teams to your own tournaments" });
    }
    await Team.create({
      teamName,
      teamCoach,
      tournament: tourId,
      createdBy: req.scorer._id,
    });
    return res.status(201).json({ message: "Team Created Successfully" });
  } catch (error) {
    return res.status(422).json({ message: error.message || "Invalid team" });
  }
}

async function handleGetAllTeams(req, res) {
  const tourId = req.params.id;

  try {
    const teams = await Team.find({ tournament: tourId });
    return res.status(200).json({ message: "Found", data: teams });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching teams" });
  }
}

async function handleDeleteTeam(req, res) {
  const { teamId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    return res.status(400).json({ message: "Invalid Team ID format" });
  }

  try {
    const team = await loadOwned(res, Team, teamId, req.scorer._id, "Team");
    if (!team) return;

    // The team's squad sheet goes with it.
    await Players.deleteMany({ teamId: team._id });
    await team.deleteOne();
    return res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Team Delete error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

async function handleUpdateTeam(req, res) {
  const { teamId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    return res.status(400).json({ message: "Invalid Team ID format" });
  }

  try {
    const team = await loadOwned(res, Team, teamId, req.scorer._id, "Team");
    if (!team) return;

    const updates = pickFields(req.body, TEAM_EDITABLE);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No editable fields provided" });
    }
    Object.assign(team, updates);
    await team.save();

    return res.json({ message: "Team Updated Successfully", data: team });
  } catch (error) {
    console.error("Team Update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

async function handleGetTeamById(req, res) {
  const { teamId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    return res.status(400).json({ message: "Invalid team ID format." });
  }

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }
    return res
      .status(200)
      .json({ message: "Team fetch successful.", data: team });
  } catch (error) {
    console.error("Error fetching team:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

module.exports = {
  handleCreateTournament,
  handleUpdateTournament,
  handleDeleteTournament,
  handleShowAllTournament,
  handleGetTourById,
  handleCreateTeam,
  handleGetAllTeams,
  handleDeleteTeam,
  handleUpdateTeam,
  handleGetTeamById,
};
