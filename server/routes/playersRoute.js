const express = require("express");
const {
  handleAddPlayers,
  handleGetPlayers,
  handleDeletePlayers,
  handleUpdatePlayers,
  handleGetTeams,
} = require("../controllers/playersController");
const router = express.Router();

router.post("/", handleAddPlayers);
router.get("/:tourId/:teamId", handleGetPlayers);
router.put("/:tourId/:teamId", handleUpdatePlayers);
router.delete("/:id", handleDeletePlayers);
router.get("/:teamId", handleGetTeams);

module.exports = router;
