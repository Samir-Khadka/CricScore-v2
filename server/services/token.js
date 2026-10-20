const jwt = require("jsonwebtoken");
const config = require("../config");

function createJwtToken(scorer) {
  const payload = {
    _id: scorer._id,
    email: scorer.email,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiry });
}

function validateJwtToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = {
  createJwtToken,
  validateJwtToken,
};
