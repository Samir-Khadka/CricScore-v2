const Innings = require("../models/Innings");
const Match = require("../models/Match");
const scoring = require("../services/scoringService");

function emitLive(req, matchId) {
  const io = req.app.get("io");
  if (!io) return;
  Innings.find({ matchId })
    .then((inn) => io.to(`match/${matchId}`).emit("matchLiveUpdate", { inn }))
    .catch((e) => console.error("socket emit failed:", e.message));
  Match.find({ matchState: "live" })
    .populate("innings")
    .populate("tournament_id", "format")
    .then((liveMatches) => io.to("homeRoom").emit("liveMatches", liveMatches))
    .catch((e) => console.error("socket emit failed:", e.message));
}

async function handleBallByBall(req, res) {
  try {
    const inningNum = Number(req.body.inningNumber) || 1;
    const result = await scoring.postBall(
      req.params.matchId,
      inningNum,
      req.body,
      req.scorer?._id
    );
    emitLive(req, req.params.matchId);
    return res.status(200).json({
      message: "Updated",
      data: result.inning,
      state: result.state,
      ballEvent: result.ballEvent,
      ...(result.result ? { result: result.result } : {}),
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
}

async function handleUndoBall(req, res) {
  try {
    const inningNum = Number(req.body.inningNumber || req.query.inningNumber) || 1;
    const result = await scoring.undoLastBall(
      req.params.matchId,
      inningNum,
      req.scorer?._id
    );
    emitLive(req, req.params.matchId);
    return res.status(200).json({
      message: "Ball undone",
      data: result.inning,
      state: result.state,
    });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
}

async function handleGetState(req, res) {
  try {
    const inningNum = Number(req.query.inningNumber) || 1;
    const { inning, state, events } = await scoring.getInningsState(
      req.params.matchId,
      inningNum
    );
    return res.status(200).json({ message: "Success", data: inning, state, events });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Internal Server Error" });
  }
}

async function handleGetFirstInning(req, res) {
  try {
    const matchId = req.params.matchId;
    const inning = await Innings.findOne({
      inningNumber: 1,
      matchId: matchId,
    })
      .select([
        "batting_team",
        "inningNumber",
        "runs",
        "wickets",
        "over",
        "balls",
        "matchId",
      ])
      .populate("batting_team", "teamName");
    return res.status(200).json({ message: "Success", data: inning });
  } catch (error) {
    return res.status(500).json({ message: "Cannot get first inning" });
  }
}

module.exports = {
  handleBallByBall,
  handleUndoBall,
  handleGetState,
  handleGetFirstInning,
};
