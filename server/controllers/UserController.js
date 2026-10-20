const BallEvents = require("../models/BallEvents");
const Innings = require("../models/Innings");
const Match = require("../models/Match");

async function getLiveMatches(req, res) {
  try {
    const count = req.params.count;

    const liveMatches = await Match.find({ matchState: "Live" })
      .limit(count)
      .populate("innings")
      .populate("tournament_id", "format");

    return res
      .status(200)
      .json({ message: "Fetched live matches", data: liveMatches });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to fetch" });
  }
}

async function getMatch(req, res) {
  try {
    const matchId = req.params.matchId;
    const mtch = await Match.findById(matchId).populate(
      "tournament_id",
      "format"
    );
    const innings = await Innings.find({ matchId });

    const ballByball = await BallEvents.find({
      inning: { $in: innings.map((m) => m._id) },
    })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      message: "Fetched",
      match: mtch,
      inning: innings,
      ballEvent: ballByball,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch" });
  }
}

async function getScheduledMatches(req, res) {
  try {
    const count = req.params.count;

    const Matches = await Match.find({ matchState: "upcoming" })
      .limit(count)
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "Fetched upcoming matches", data: Matches });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to fetch" });
  }
}

async function getRecentMatches(req, res) {
  try {
    const count = req.params.count;

    const liveMatches = await Match.find({ matchState: "completed" })
      .sort({ updatedAt: -1 })
      .limit(count)
      .select("-umpires -playingXI -matchRefree")
      .populate("innings", "-batsmen -bowlers")
      .populate("tournament_id", "format");

    return res
      .status(200)
      .json({ message: "Fetched completed matches", data: liveMatches });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to fetch" });
  }
}

module.exports = {
  getLiveMatches,
  getMatch,
  getScheduledMatches,
  getRecentMatches,
};
