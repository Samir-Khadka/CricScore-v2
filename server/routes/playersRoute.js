const express = require("express");
const { handleAddPlayers, handleGetPlayers, handleDeletePlayers,handleUpdatePlayers,handleGetTeams } = require("../controllers/playersController");
const router = express.Router()

router.post("/", handleAddPlayers);
router.get("/:tourId/:teamId", handleGetPlayers);
router.delete("/:id", handleDeletePlayers);
router.put("/update",handleUpdatePlayers);
router.get("/:teamId",handleGetTeams);

module.exports = router;