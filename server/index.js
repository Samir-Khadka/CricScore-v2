const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const config = require("./config");
const connectToMongoose = require("./services/db.js");
const checkAuthCookie = require("./middlewares/authenticate.js");

const homepageRoute = require("./routes/homeRoute.js");
const scorerRoute = require("./routes/scorerRoute.js");
const tournamentRoute = require("./routes/tournamentRoute.js");
const playersRoute = require("./routes/playersRoute.js");
const matchRoute = require("./routes/matchRoute.js");
const userRoute = require("./routes/UserRouter.js");
const ballByballRoute = require("./routes/ballByBallRoute.js");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins, credentials: true },
});

app.use(
  cors({
    origin: config.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Public routes — no auth cookie required.
app.use("/api/cricscore/scorer", scorerRoute);
app.use("/api/cricscore/user", userRoute);
app.use("/api/cricscore/view", homepageRoute);

// Everything below requires a logged-in scorer.
app.use(checkAuthCookie("token"));
app.use("/api/cricscore/ballByball", ballByballRoute);
app.use("/api/cricscore/tournament", tournamentRoute);
app.use("/api/cricscore/players", playersRoute);
app.use("/api/cricscore/match", matchRoute);
app.use("/api/cricscore/teams", playersRoute);

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
