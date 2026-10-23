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
const checkAuthCookie = require("../middlewares/authenticate");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get("/", (req, res) => {
  res.send({ message: "Scorer Page" });
});

router.post("/login", validateLogin, handleScorerLogin);
router.post("/signup", validateScorer, handleScorerSignup);
// Profile mutation requires the session cookie, and the controller
// only ever touches the caller's own record.
router.put("/update", checkAuthCookie("token"), updateScorer);
router.post(
  "/upload/:email",
  checkAuthCookie("token"),
  upload.single("file"),
  uploadImage
);
router.get("/image/:email", getScorerImage);

module.exports = router;
