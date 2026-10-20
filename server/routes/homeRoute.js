const express = require("express");
const {
  handleGetAllTournaments,
  handleGetTournamentInfo,
  handleGetMatches,
  handleGetMatchDetail,
  handleGetPointsTable,
} = require("../controllers/viewerController");
const router = express.Router();

router.get("/tournaments", handleGetAllTournaments);
router.get("/tournaments/:id", handleGetTournamentInfo);
router.get("/tournaments/:id/points-table", handleGetPointsTable);
router.get("/matches", handleGetMatches);
router.get("/matches/:id", handleGetMatchDetail);

module.exports = router;
