const express = require("express");
const router = express.Router();
const {
  handleCreateTournament,
  handleShowAllTournament,
  handleGetTourById,
  handleCreateTeam,
  handleGetAllTeams,
  handleUpdateTournament,
  handleDeleteTournament,
  handleDeleteTeam,
  handleUpdateTeam,
  handleGetTeamById,
} = require("../controllers/tournamentController");
const validateTournament = require("../middlewares/validateCreateTournament");
const validateTeam = require("../middlewares/validateCreateTeam");

// Resource ids always travel in the URL, never in the request body.
// Update routes skip the create validators: an update is partial, and
// the create rules (e.g. "start date cannot be in the past") would make
// an in-progress tournament uneditable. The controllers allowlist the
// editable fields and enforce ownership instead.
router.get("/", handleShowAllTournament);
router.post("/create", validateTournament, handleCreateTournament);
router.get("/:id", handleGetTourById);
router.put("/:id", handleUpdateTournament);
router.delete("/:id", handleDeleteTournament);

router.post("/:id/teams", validateTeam, handleCreateTeam);
router.get("/:id/teams", handleGetAllTeams);
router.get("/teams/:teamId", handleGetTeamById);
router.put("/teams/:teamId", handleUpdateTeam);
router.delete("/teams/:teamId", handleDeleteTeam);

module.exports = router;
