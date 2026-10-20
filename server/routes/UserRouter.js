const express = require("express");
const {getLiveMatches, getMatch, getScheduledMatches, getRecentMatches} = require("../controllers/UserController");
const router = express.Router();

router.get("/live/:count", getLiveMatches);
router.get("/match/:matchId", getMatch);
router.get("/upcoming/:count", getScheduledMatches);
router.get("/recent/:count", getRecentMatches);
module.exports = router;