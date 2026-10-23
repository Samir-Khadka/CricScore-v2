/**
 * Thin API contract suite: real Express wiring (same mounts + auth
 * middleware as index.js) against an in-memory MongoDB.
 *
 * Covers the guarantees the 2026-10-23 fixes introduced:
 *  - 401 (not 422) for missing / invalid auth, no raw JWT errors leaked
 *  - ownership (403) + field allowlists on every non-scoring CRUD route
 *  - 404 for missing resources
 *  - match duplicate check scoped per tournament
 *  - scoring: idempotent replay + optimistic-concurrency 409
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { MongoMemoryServer } = require("mongodb-memory-server");

const checkAuthCookie = require("../middlewares/authenticate");
const scorerRoute = require("../routes/scorerRoute");
const tournamentRoute = require("../routes/tournamentRoute");
const playersRoute = require("../routes/playersRoute");
const matchRoute = require("../routes/matchRoute");
const ballByballRoute = require("../routes/ballByBallRoute");
const homeRoute = require("../routes/homeRoute");

const Scorer = require("../models/Scorer");
const Innings = require("../models/Innings");
const BallEvents = require("../models/BallEvents");

let mongod;
let server;
let base;
let cookieA;
let cookieB;
let scorerAId;
let scorerBId;
const F = {}; // fixtures

async function req(method, path, { cookie, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, headers: res.headers };
}

async function login(email, password) {
  const res = await req("POST", "/api/cricscore/scorer/login", {
    body: { email, password },
  });
  assert.equal(res.status, 200, `login ${email}`);
  const setCookie = res.headers.getSetCookie().join(";");
  const tokenPair = setCookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("token="));
  assert.ok(tokenPair, "login sets the token cookie");
  return { cookie: tokenPair, user: res.json.user };
}

const squad = (prefix) =>
  Array.from({ length: 11 }, (_, i) => ({
    name: `${prefix} Player ${i + 1}`,
    role: "Batsman",
    isCaptain: i === 0,
  }));

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api/cricscore/scorer", scorerRoute);
  app.use("/api/cricscore/view", homeRoute);
  app.use("/api/cricscore/ballByball", checkAuthCookie("token"), ballByballRoute);
  app.use("/api/cricscore/tournament", checkAuthCookie("token"), tournamentRoute);
  app.use("/api/cricscore/players", checkAuthCookie("token"), playersRoute);
  app.use("/api/cricscore/match", checkAuthCookie("token"), matchRoute);
  app.use("/api/cricscore/teams", checkAuthCookie("token"), playersRoute);
  app.use((req2, res) => res.status(404).json({ message: "Not found" }));

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;

  const hash = bcrypt.hashSync("password123", 4);
  await Scorer.create([
    { fullName: "Owner A", email: "a@test.dev", password: hash },
    { fullName: "Other B", email: "b@test.dev", password: hash },
  ]);
  const la = await login("a@test.dev", "password123");
  const lb = await login("b@test.dev", "password123");
  cookieA = la.cookie;
  cookieB = lb.cookie;
  scorerAId = la.user.id;
  scorerBId = lb.user.id;

  // Owner A's tournament, teams, squads, match.
  let r = await req("POST", "/api/cricscore/tournament/create", {
    cookie: cookieA,
    body: {
      tournament_name: "API Cup",
      start_date: "2027-01-01",
      end_date: "2027-02-01",
      venue: "Test Oval",
      location: "Testville",
      format: 20,
    },
  });
  assert.equal(r.status, 201, "create tournament A");
  r = await req("GET", "/api/cricscore/tournament/", { cookie: cookieA });
  F.tourA = r.json.data[0]._id;

  for (const name of ["Alpha", "Beta"]) {
    r = await req("POST", `/api/cricscore/tournament/${F.tourA}/teams`, {
      cookie: cookieA,
      body: { teamName: name },
    });
    assert.equal(r.status, 201, `create team ${name}`);
  }
  r = await req("GET", `/api/cricscore/tournament/${F.tourA}/teams`, {
    cookie: cookieA,
  });
  [F.teamA1, F.teamA2] = r.json.data.map((t) => t._id);

  for (const [teamId, prefix] of [
    [F.teamA1, "Alpha"],
    [F.teamA2, "Beta"],
  ]) {
    r = await req("POST", "/api/cricscore/players", {
      cookie: cookieA,
      body: { tourId: F.tourA, teamId, players: squad(prefix) },
    });
    assert.equal(r.status, 201, `add squad ${prefix}`);
  }
  r = await req("GET", `/api/cricscore/players/${F.tourA}/${F.teamA1}`, {
    cookie: cookieA,
  });
  F.alphaPlayers = r.json.players[0].players.map((p) => String(p._id));
  F.alphaSquadDoc = r.json.players[0]._id;
  r = await req("GET", `/api/cricscore/players/${F.tourA}/${F.teamA2}`, {
    cookie: cookieA,
  });
  F.betaPlayers = r.json.players[0].players.map((p) => String(p._id));

  async function createMatch(cookie, tourId, tourName, date, time) {
    const res = await req("POST", "/api/cricscore/match", {
      cookie,
      body: {
        tournament_id: tourId,
        tournament_name: tourName,
        teamA: "Alpha",
        teamB: "Beta",
        teamA_id: F.teamA1,
        teamB_id: F.teamA2,
        match_date: date,
        match_time: time,
        venue: "Test Oval",
      },
    });
    return res;
  }
  F.createMatch = createMatch;

  r = await createMatch(cookieA, F.tourA, "API Cup", "2027-01-10", "10:00");
  assert.equal(r.status, 201, "create match");
  r = await req("GET", `/api/cricscore/match/${scorerAId}`, { cookie: cookieA });
  F.matchA = r.json.data.find((m) => m.match_time === "10:00")._id;

  // A second match dedicated to ball-posting tests, with innings 1 ready.
  r = await createMatch(cookieA, F.tourA, "API Cup", "2027-01-11", "10:00");
  assert.equal(r.status, 201, "create scoring match");
  r = await req("GET", `/api/cricscore/match/${scorerAId}`, { cookie: cookieA });
  F.matchScore = r.json.data.find((m) => m.match_time === "10:00" && String(m._id) !== String(F.matchA))._id;
  await Innings.create({
    tournament: F.tourA,
    matchId: F.matchScore,
    inningNumber: 1,
    batting_team: F.teamA1,
    fielding_team: F.teamA2,
  });

  // Scorer B's own tournament for the duplicate-scope test.
  r = await req("POST", "/api/cricscore/tournament/create", {
    cookie: cookieB,
    body: {
      tournament_name: "B League",
      start_date: "2027-01-01",
      end_date: "2027-02-01",
      venue: "Other Ground",
      location: "Elsewhere",
      format: 20,
    },
  });
  assert.equal(r.status, 201, "create tournament B");
  r = await req("GET", "/api/cricscore/tournament/", { cookie: cookieB });
  F.tourB = r.json.data[0]._id;
});

after(async () => {
  server?.close();
  await mongoose.disconnect();
  await mongod?.stop();
});

/* ------------------------------- auth ---------------------------------- */

test("unauthenticated CRUD request gets 401, not 422", async () => {
  const r = await req("GET", `/api/cricscore/match/${scorerAId}`);
  assert.equal(r.status, 401);
});

test("unauthenticated ball post gets 401", async () => {
  const r = await req("POST", `/api/cricscore/ballByball/${F.matchScore}`, {
    body: { inningNumber: 1 },
  });
  assert.equal(r.status, 401);
});

test("garbage token gets 401 without leaking the raw JWT error", async () => {
  const r = await req("GET", `/api/cricscore/match/${scorerAId}`, {
    cookie: "token=not-a-real-token",
  });
  assert.equal(r.status, 401);
  assert.ok(!/jwt|JsonWebToken|malformed/i.test(r.json.message || ""));
});

/* ---------------------------- ownership -------------------------------- */

test("non-owner cannot update a match (403)", async () => {
  const r = await req("PUT", `/api/cricscore/match/${F.matchA}`, {
    cookie: cookieB,
    body: { venue: "Hijacked" },
  });
  assert.equal(r.status, 403);
});

test("owner update applies the allowlist and drops protected fields", async () => {
  const r = await req("PUT", `/api/cricscore/match/${F.matchA}`, {
    cookie: cookieA,
    body: {
      venue: "New Venue",
      winner: F.teamA2,
      matchState: "completed",
      createdBy: scorerBId,
    },
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.venue, "New Venue");
  assert.notEqual(String(r.json.data.winner || ""), String(F.teamA2));
  assert.notEqual(r.json.data.matchState, "completed");
  assert.equal(String(r.json.data.createdBy), String(scorerAId));
});

test("updating a missing match returns 404", async () => {
  const r = await req("PUT", `/api/cricscore/match/${new mongoose.Types.ObjectId()}`, {
    cookie: cookieA,
    body: { venue: "Nowhere" },
  });
  assert.equal(r.status, 404);
});

test("non-owner cannot delete a match (403)", async () => {
  const r = await req("DELETE", `/api/cricscore/match/${F.matchA}`, {
    cookie: cookieB,
  });
  assert.equal(r.status, 403);
});

test("non-owner cannot update or delete a tournament (403)", async () => {
  const u = await req("PUT", `/api/cricscore/tournament/${F.tourA}`, {
    cookie: cookieB,
    body: { venue: "Hijacked" },
  });
  assert.equal(u.status, 403);
  const d = await req("DELETE", `/api/cricscore/tournament/${F.tourA}`, {
    cookie: cookieB,
  });
  assert.equal(d.status, 403);
});

test("tournament update cannot reassign createdBy", async () => {
  const r = await req("PUT", `/api/cricscore/tournament/${F.tourA}`, {
    cookie: cookieA,
    body: { venue: "Renamed Venue", createdBy: scorerBId, _id: F.tourB },
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.venue, "Renamed Venue");
  assert.equal(String(r.json.data.createdBy), String(scorerAId));
  assert.equal(String(r.json.data._id), String(F.tourA));
});

test("deleting a missing tournament returns 404", async () => {
  const r = await req("DELETE", `/api/cricscore/tournament/${new mongoose.Types.ObjectId()}`, {
    cookie: cookieA,
  });
  assert.equal(r.status, 404);
});

test("non-owner cannot update or delete a team (403)", async () => {
  const u = await req("PUT", `/api/cricscore/tournament/teams/${F.teamA1}`, {
    cookie: cookieB,
    body: { teamName: "Hijacked XI" },
  });
  assert.equal(u.status, 403);
  const d = await req("DELETE", `/api/cricscore/tournament/teams/${F.teamA1}`, {
    cookie: cookieB,
  });
  assert.equal(d.status, 403);
});

test("non-owner cannot add a team to someone else's tournament (403)", async () => {
  const r = await req("POST", `/api/cricscore/tournament/${F.tourA}/teams`, {
    cookie: cookieB,
    body: { teamName: "Intruders" },
  });
  assert.equal(r.status, 403);
});

test("non-owner cannot replace or delete a squad (403)", async () => {
  const u = await req("PUT", `/api/cricscore/players/${F.tourA}/${F.teamA1}`, {
    cookie: cookieB,
    body: { players: squad("Fake") },
  });
  assert.equal(u.status, 403);
  const d = await req("DELETE", `/api/cricscore/players/${F.alphaSquadDoc}`, {
    cookie: cookieB,
  });
  assert.equal(d.status, 403);
});

test("a scorer cannot list another scorer's matches (403)", async () => {
  const r = await req("GET", `/api/cricscore/match/${scorerBId}`, {
    cookie: cookieA,
  });
  assert.equal(r.status, 403);
});

test("match state endpoint: non-owner 403, legacy states rejected 400", async () => {
  const asB = await req("PATCH", `/api/cricscore/match/${F.matchA}/state`, {
    cookie: cookieB,
    body: { match_state: "live" },
  });
  assert.equal(asB.status, 403);
  const bad = await req("PATCH", `/api/cricscore/match/${F.matchA}/state`, {
    cookie: cookieA,
    body: { match_state: "pause" },
  });
  assert.equal(bad.status, 400);
  const ok = await req("PATCH", `/api/cricscore/match/${F.matchA}/state`, {
    cookie: cookieA,
    body: { match_state: "upcoming" },
  });
  assert.equal(ok.status, 200);
});

test("non-owner cannot set the playing XI (403)", async () => {
  const r = await req("PUT", `/api/cricscore/match/${F.matchA}/selectXI`, {
    cookie: cookieB,
    body: {
      playingXI: [
        { teamId: F.teamA1, teamName: "Alpha", players: [] },
        { teamId: F.teamA2, teamName: "Beta", players: [] },
      ],
      toss: { wonBy: String(F.teamA1), decision: "bat" },
    },
  });
  assert.equal(r.status, 403);
});

/* ------------------------- duplicate scoping ---------------------------- */

test("same date+time in a DIFFERENT tournament is allowed", async () => {
  const r = await F.createMatch(cookieB, F.tourB, "B League", "2027-01-10", "10:00");
  assert.equal(r.status, 201);
});

test("same date+time in the SAME tournament is rejected 422", async () => {
  const r = await F.createMatch(cookieA, F.tourA, "API Cup", "2027-01-10", "10:00");
  assert.equal(r.status, 422);
});

test("creating a match in someone else's tournament is 403", async () => {
  const r = await F.createMatch(cookieB, F.tourA, "API Cup", "2027-01-12", "10:00");
  assert.equal(r.status, 403);
});

/* ------------------------------ scoring --------------------------------- */

const ballBody = (over = {}) => ({
  inningNumber: 1,
  striker: F.alphaPlayers[0],
  nonStriker: F.alphaPlayers[1],
  bowler: F.betaPlayers[0],
  batRuns: 1,
  extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, penalty: 0 },
  wicket: null,
  ...over,
});

test("non-owner cannot post a ball (403)", async () => {
  const r = await req("POST", `/api/cricscore/ballByball/${F.matchScore}`, {
    cookie: cookieB,
    body: ballBody({ clientEventId: "evt-b-1", expectedSequence: 0 }),
  });
  assert.equal(r.status, 403);
});

test("owner posts a ball; replaying it is an idempotent duplicate", async () => {
  const body = ballBody({ clientEventId: "evt-a-1", expectedSequence: 0 });
  const first = await req("POST", `/api/cricscore/ballByball/${F.matchScore}`, {
    cookie: cookieA,
    body,
  });
  assert.equal(first.status, 200);
  assert.equal(first.json.state.runs, 1);

  const replay = await req("POST", `/api/cricscore/ballByball/${F.matchScore}`, {
    cookie: cookieA,
    body,
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.json.duplicate, true);

  const count = await BallEvents.countDocuments({
    inning: (await Innings.findOne({ matchId: F.matchScore, inningNumber: 1 }))._id,
    voided: false,
  });
  assert.equal(count, 1, "the replay did not double-count the ball");
});

test("a stale expectedSequence is refused with 409", async () => {
  const r = await req("POST", `/api/cricscore/ballByball/${F.matchScore}`, {
    cookie: cookieA,
    body: ballBody({ clientEventId: "evt-a-2", expectedSequence: 0 }),
  });
  assert.equal(r.status, 409);
});

test("the next ball with the correct sequence succeeds", async () => {
  const r = await req("POST", `/api/cricscore/ballByball/${F.matchScore}`, {
    cookie: cookieA,
    body: ballBody({ clientEventId: "evt-a-3", expectedSequence: 1, batRuns: 4 }),
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.state.runs, 5);
});

/* ------------------------- public viewer smoke -------------------------- */

test("points table still computes after the batched-innings refactor", async () => {
  const r = await req(
    "GET",
    `/api/cricscore/view/tournaments/${F.tourA}/points-table`
  );
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.json.data));
});
