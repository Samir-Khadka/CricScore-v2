const express = require("express");
const {
  handleScorerLogin,
  handleScorerSignup,
  updateScorer,
  uploadImage,
  getScorerImage,
} = require("../controllers/scorerController");
const validateScorer = require("../middlewares/validateCreateScorer");
const validateLogin = require("../middlewares/validateLogin");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get("/", (req, res) => {
  res.send({ message: "Scorer Page" });
});

router.post("/login", validateLogin, handleScorerLogin);
router.post("/signup", validateScorer, handleScorerSignup);
router.put("/update",updateScorer);
router.post("/upload/:email", upload.single("file"), uploadImage);
router.get("/image/:email", getScorerImage);

module.exports = router;
