const { validateJwtToken } = require("../services/token");

function checkAuthCookie(cookieName) {
  return (req, res, next) => {
    const token = req.cookies?.[cookieName];
    if (!token) {
      // 401 (not 422): the client must be able to tell "log in again"
      // apart from "your input was invalid".
      return res
        .status(401)
        .json({ message: "Authentication required: login again" });
    }
    try {
      const payload = validateJwtToken(token);
      req.scorer = payload;
      return next();
    } catch (error) {
      // Never leak the raw JWT error to clients; log it server-side.
      console.error("Auth token rejected:", error.message);
      return res
        .status(401)
        .json({ message: "Session invalid or expired: login again" });
    }
  };
}

module.exports = checkAuthCookie;
