const express = require("express");
const {
  handleGetAllTournaments,
  handleGetTournamentInfo,
  handleGetMatches,
  handleGetMatchDetail,
  handleGetPointsTable,
  handleGetTournamentStats,
} = require("../controllers/viewerController");
const router = express.Router();

router.get("/tournaments", handleGetAllTournaments);
router.get("/tournaments/:id", handleGetTournamentInfo);
router.get("/tournaments/:id/points-table", handleGetPointsTable);
router.get("/tournaments/:id/stats", handleGetTournamentStats);
router.get("/matches", handleGetMatches);
router.get("/matches/:id", handleGetMatchDetail);

module.exports = router;
