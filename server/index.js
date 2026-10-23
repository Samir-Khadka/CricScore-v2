const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const config = require("./config");
const connectToMongoose = require("./services/db.js");
const checkAuthCookie = require("./middlewares/authenticate.js");

const homepageRoute = require("./routes/homeRoute.js");
const scorerRoute = require("./routes/scorerRoute.js");
const tournamentRoute = require("./routes/tournamentRoute.js");
const playersRoute = require("./routes/playersRoute.js");
const matchRoute = require("./routes/matchRoute.js");
const userRoute = require("./routes/userRoute.js");
const ballByballRoute = require("./routes/ballByBallRoute.js");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins, credentials: true },
});

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Brute-force guard for credential endpoints; generous cap elsewhere.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again in a few minutes." },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Slow down." },
});
app.use("/api/cricscore/scorer", authLimiter);
app.use("/api/cricscore", apiLimiter);

// Public routes — no auth cookie required.
app.use("/api/cricscore/scorer", scorerRoute);
app.use("/api/cricscore/user", userRoute);
app.use("/api/cricscore/view", homepageRoute);

// Everything below requires a logged-in scorer (auth scoped per-prefix so
// unknown routes still reach the JSON 404 handler).
app.use("/api/cricscore/ballByball", checkAuthCookie("token"), ballByballRoute);
app.use("/api/cricscore/tournament", checkAuthCookie("token"), tournamentRoute);
app.use("/api/cricscore/players", checkAuthCookie("token"), playersRoute);
app.use("/api/cricscore/match", checkAuthCookie("token"), matchRoute);
app.use("/api/cricscore/teams", checkAuthCookie("token"), playersRoute);

// JSON 404 + central error handler (no stack traces to clients).
app.use((req, res) => res.status(404).json({ message: "Not found" }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large" });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Internal Server Error" });
});

app.set("io", io);
io.on("connection", (socket) => {
  const module = socket.handshake.query.module;
  const matchId = socket.handshake.query.matchId;

  if (module === "home") {
    socket.join("homeRoom");
  } else if (module === "match" && matchId) {
    socket.join(`match/${matchId}`);
  }
});

connectToMongoose();

httpServer.listen(config.port, () => {
  console.log(`Server started at port ${config.port}`);
});
