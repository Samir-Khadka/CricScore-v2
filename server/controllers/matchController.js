const mongoose = require("mongoose");
const Match = require("../models/Match");
const Tournament = require("../models/Tournament");
const Innings = require("../models/Innings");
const BallEvents = require("../models/BallEvents");
const { pickFields, loadOwned } = require("../services/ownership");

// Fields a scorer may change on their own match after creation. Match
// state, winner, result, innings, playingXI and createdBy are NOT here:
// they move through their own endpoints / the scoring engine only.
const MATCH_EDITABLE = [
  "match_date",
  "match_time",
  "venue",
  "teamA",
  "teamB",
  "teamA_id",
  "teamB_id",
  "toss",
  "umpires",
  "matchRefree",
];

async function handleCreateMatch(req, res) {
  try {
    const { match_time, match_date, tournament_id } = req.body;

    // A fixture belongs to a tournament the scorer owns.
    if (!mongoose.Types.ObjectId.isValid(tournament_id)) {
      return res.status(400).json({ message: "Invalid tournament id" });
    }
    const tournament = await Tournament.findById(tournament_id);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    if (String(tournament.createdBy) !== String(req.scorer._id)) {
      return res
        .status(403)
        .json({ message: "You can only add matches to your own tournaments" });
    }

    // Duplicate check is scoped to THIS tournament: two different
    // tournaments may legitimately play at the same date and time.
    const matchExists = await Match.findOne({
      tournament_id,
      match_time,
      match_date,
    });
    if (matchExists) {
      return res.status(422).json({
        message: "A match already exists in this tournament at that date and time",
      });
    }

    await Match.create({
      tournament_id: req.body.tournament_id,
      tournament_name: req.body.tournament_name,
      teamA: req.body.teamA,
      teamB: req.body.teamB,
      teamA_id: req.body.teamA_id,
      teamB_id: req.body.teamB_id,
      match_date: req.body.match_date,
      match_time: req.body.match_time,
      matchState: "upcoming",
      venue: req.body.venue,
      createdBy: req.scorer._id,
    });

    return res.status(201).json({ message: "Match created successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Some error occured while creating match" });
  }
}

async function handleGetMatches(req, res) {
  // The list is always the caller's own matches — the :scorerId param
  // may not be used to enumerate another scorer's fixtures.
  if (String(req.params.scorerId) !== String(req.scorer._id)) {
    return res
      .status(403)
      .json({ message: "You can only list your own matches" });
  }

  try {
    const matches = await Match.find({ createdBy: req.scorer._id }).select(
      "-toss -umpires -matchRefree -innings -result -points"
    );
    if (matches.length === 0) {
      return res.status(404).json({ message: "No matches found" });
    }
    return res.status(200).json({ message: "Found", data: matches });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Some error occured while fetching matches" });
  }
}

async function handleGetMatch(req, res) {
  const { matchId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ message: "Invalid match ID format." });
    }

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: "Match not found." });
    }

    return res.status(200).json({ message: "Found", data: match });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
}

async function handleUpdateMatch(req, res) {
  try {
    const matchId = req.params.matchId;
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ message: "Invalid match ID format." });
    }
    const match = await loadOwned(res, Match, matchId, req.scorer._id, "Match");
    if (!match) return;

    const updates = pickFields(req.body, MATCH_EDITABLE);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No editable fields provided" });
    }
    Object.assign(match, updates);
    await match.save();
    return res
      .status(200)
      .json({ message: "Updated Successfully", data: match });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Some error occured while updating match" });
  }
}

async function handleDeleteMatch(req, res) {
  try {
    const matchId = req.params.matchId;
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ message: "Invalid match ID format." });
    }
    const match = await loadOwned(res, Match, matchId, req.scorer._id, "Match");
    if (!match) return;

    // Cascade: the match's innings and their ball-by-ball logs go with
    // it, so no orphaned scoring data is left behind.
    const innings = await Innings.find({ matchId: match._id }).select("_id");
    if (innings.length > 0) {
      await BallEvents.deleteMany({
        inning: { $in: innings.map((i) => i._id) },
      });
      await Innings.deleteMany({ matchId: match._id });
    }
    await match.deleteOne();
    return res.status(200).json({ message: "Deleted Successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Some error occured while deleting match" });
  }
}

async function savePlayingXI(req, res, next) {
  const { matchId } = req.params;
  const { playingXI, toss, umpires, matchRefree } = req.body;

  if (!playingXI || !Array.isArray(playingXI) || playingXI.length !== 2)
    return res.status(400).json({ message: "Both teams must be included" });

  try {
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (String(match.createdBy) !== String(req.scorer._id)) {
      return res
        .status(403)
        .json({ message: "You can only set up your own matches" });
    }

    // Update match info
    if (toss) match.toss = toss;
    if (umpires) match.umpires = umpires;
    if (matchRefree) match.matchRefree = matchRefree;

    // Save playing XI. State values are lowercase across the modern stack
    // ("live" / "completed" / "upcoming") — the old capital "Live" made
    // matches invisible to every live query until the first ball was
    // bowled. Never resurrect a completed match by re-saving its XI.
    match.playingXI = playingXI;
    if (match.matchState !== "completed") match.matchState = "live";
    await match.save();

    //also create inning for this match
    req.body.matchId = matchId;
    req.body.refered_from = "savePlayingXI";
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

async function handleUpdateMatchState(req, res) {
  const { match_state } = req.body;
  const { matchId } = req.params;

  // Canonical state set for the modern stack (see savePlayingXI note).
  if (!["upcoming", "live", "completed"].includes(match_state)) {
    return res.status(400).json({ message: "Invalid match state" });
  }

  if (!mongoose.Types.ObjectId.isValid(matchId)) {
    return res.status(400).json({ message: "Invalid match ID format." });
  }

  try {
    const match = await loadOwned(res, Match, matchId, req.scorer._id, "Match");
    if (!match) return;

    match.matchState = match_state;
    await match.save();

    return res.json({ message: "Match state updated", data: match });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  handleCreateMatch,
  handleGetMatches,
  handleGetMatch,
  handleUpdateMatch,
  handleDeleteMatch,
  savePlayingXI,
  handleUpdateMatchState,
};
