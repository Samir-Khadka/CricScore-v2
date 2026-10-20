const Innings = require("../models/Innings");
const Match = require("../models/Match");

async function handleCreateInnings(req, res) {
  try {
    const { tournament_id, toss, matchId, playingXI } = req.body;

    let batting_team = "";
    let fielding_team = "";

    if (toss.decision === "bat") {
      batting_team = toss.wonBy;
      fielding_team = playingXI.find(
        (team) => team.teamId !== toss.wonBy
      ).teamId;
    } else {
      fielding_team = toss.wonBy;
      batting_team = playingXI.find(
        (team) => team.teamId !== toss.wonBy
      ).teamId;
    }

    const existingInning = await Innings.findOne({
      tournament: tournament_id,
      matchId: matchId,
      inningNumber: 1,
    });

    if (existingInning) {
      return res.status(200).json({ message: "Inning already exists" });
    }

    const createdInning = await Innings.create({
      tournament: tournament_id,
      matchId: matchId,
      inningNumber: 1,
      batting_team,
      fielding_team,
      runs: 0,
      wickets: 0,
      balls: 0,
      current_run_rate: 0,
      required_run_rate: 0,
      target: 0,
      batsmen: [],
      bowlers: [],
    });

    await Match.findByIdAndUpdate(matchId, {
      $push: { innings: createdInning._id },
    });

    createSecondInnings(createdInning);
    // Success response
    return res.status(201).json({ message: "Inning created", createdInning });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create inning" });
  }
}

async function createSecondInnings(firstInning) {
  try {
    const secondInning = await Innings.create({
      tournament: firstInning.tournament,
      matchId: firstInning.matchId,
      inningNumber: 2,
      batting_team: firstInning.fielding_team,
      fielding_team: firstInning.batting_team,
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

    await Match.findByIdAndUpdate(firstInning.matchId, {
      $push: { innings: secondInning._id },
    });
  } catch (error) {
    console.log("Error while creating second innings", error);
  } finally {
    return;
  }
}

module.exports = {
  handleCreateInnings,
};
