const express = require("express");
const {
  handleBallByBall,
  handleUndoBall,
  handleGetState,
  handleGetFirstInning,
} = require("../controllers/ballByBallController");

const router = express.Router();

// Mounted behind checkAuthCookie in index.js: scoring requires a logged-in
// scorer, and the service enforces that only the match's creator can score.
router.post("/:matchId", handleBallByBall);
router.delete("/:matchId/last", handleUndoBall);
router.get("/:matchId/state", handleGetState);
router.get("/:matchId/firstInning", handleGetFirstInning);

module.exports = router;
