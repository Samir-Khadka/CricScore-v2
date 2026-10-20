// controllers/inningsController.js
const Innings = require("../models/Innings");

async function startInning(req, res) {
  try {
    const { tournamentId, matchId }=req.params; 
    const { inningNumber, battingTeam, fieldingTeam } = req.body;


    if (!battingTeam || !fieldingTeam) {
      return res.status(400).json({ message: "Batting and Fielding teams are required" });
    }

    // check if inning already exists
    const existing = await Innings.findOne({ matchId, inningNumber });
    if (existing) {
      return res.status(400).json({ message: "Inning already exists" });
    }

    const inning = new Innings({
      tournament: tournamentId,
      matchId:matchId,
      inningNumber:inningNumber,
      batting_team: battingTeam,
      fielding_team: fieldingTeam,
      runs: 0,
      wickets: 0,
      over: 0,
      balls: 0,
       current_run_rate: 0,
      required_run_rate: 0,
      target: 0,
      batsmen: [],
      bowlers: [],
    });

    await inning.save();

    return res.status(201).json({ message: "Inning started", inning });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { startInning };
