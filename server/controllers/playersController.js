const mongoose = require("mongoose");
const Players = require("../models/Players");
const Team=require("../models/Teams");
async function handleAddPlayers(req, res) {
  try {
    const pExists = await Players.find({
      tournamentId: req.body.tourId,
      teamId: req.body.teamId,
    });
    if (pExists.length > 0) {
      return res
        .status(500)
        .json({ message: "Players are already added for this team" });
    }
    await Players.create({
      tournamentId: req.body.tourId,
      teamId: req.body.teamId,
      players: req.body.players,
    });
    return res.status(201).json({ message: "Players added successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong while adding players" });
  }
}

async function handleGetPlayers(req, res) {
  try {
    const tourId = req.params.tourId;
    const teamId = req.params.teamId;
    const players = await Players.find({
      tournamentId: tourId,
      teamId: teamId,
    }).select("-tournamentId -teamId");
    if (players.length !== 0) {
      return res
        .status(200)
        .json({ message: "Players fetched successfully", players });
    }
    return res.status(404).json({ message: "Players not found" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong while fetching players." });
  }
}
async function handleGetTeams(req, res) {
  try {
    const teamId = req.params.teamId;
    const teams = await Team.find({ _id: new mongoose.Types.ObjectId(teamId) });


    if (teams.length !== 0) {
      return res
        .status(200)
        .json({ message: "Players fetched successfully", Team: teams });
    }
    return res.status(404).json({ message: "Team not found" });
  } 
  catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong while fetching Team." });
  }
};

async function handleDeletePlayers(req, res) {
  try {
    const id = req.params.id;
    await Players.findByIdAndDelete({ _id:id });
    return res.status(200).json({ message:"Players Deleted Successfully"});
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong while deleting players" });
  }
}

// Update players for a given tournament + team
async function handleUpdatePlayers (req, res) {
 try {
    const { tourId, teamId, players } = req.body;

    const updated = await Players.findOneAndUpdate(
      { 
        tournamentId: new mongoose.Types.ObjectId(tourId), 
        teamId: new mongoose.Types.ObjectId(teamId) 
      },
      { $set: { players } },
      { new: true, upsert: false }
    );

    if (!updated) {
      return res.status(404).json({ message: "Players not found to update" });
    }

    res.json({ message: "Players updated successfully", updated });
  } catch (err) {
    console.error("Error updating players:", err);
    res.status(500).json({ message: "Error updating players", error: err.message });
  }

};

module.exports = {
  handleAddPlayers,
  handleGetPlayers,
  handleDeletePlayers,
  handleUpdatePlayers,
  handleGetTeams,
};
