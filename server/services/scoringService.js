/**
 * Scoring service: the bridge between HTTP, MongoDB and the pure scoring
 * engine. Ball events are appended to the log; the innings document is a
 * SNAPSHOT re-derived from the log after every ball, so it can never
 * drift from the ball-by-ball record. Undo = void the last event and
 * re-derive.
 */
const mongoose = require("mongoose");
const BallEvents = require("../models/BallEvents");
const Innings = require("../models/Innings");
const Match = require("../models/Match");
const Players = require("../models/Players");
const { computeInningsState, matchResult, describeBall } = require("../engine/scoringEngine");

const oid = (id) =>
  id && mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/**
 * Accept both the modern payload and the legacy CRA scorer payload.
 * Legacy quirks handled here:
 *  - snake_case fields (bat_run, no_ball, leg_bye, non_striker)
 *  - "nb+2b" style events where byes were merged into extras.no_ball
 *  - how_out "run_out_striker" / "run_out_non_striker"
 */
function normalizeEvent(body) {
  if ("nonStriker" in body || "batRuns" in body) {
    // Modern shape (extras optional).
    const ex = body.extras || {};
    return {
      striker: body.striker,
      nonStriker: body.nonStriker,
      bowler: body.bowler,
      batRuns: body.batRuns || 0,
      extras: {
        wide: ex.wide || 0,
        noBall: ex.noBall || 0,
        bye: ex.bye || 0,
        legBye: ex.legBye || 0,
        penalty: ex.penalty || 0,
      },
      wicket: body.wicket || null,
    };
  }

  // Legacy shape.
  const ex = body.extras || {};
  const extras = {
    wide: ex.wide || 0,
    noBall: ex.no_ball || 0,
    bye: ex.bye || 0,
    legBye: ex.leg_bye || 0,
    penalty: ex.penalty || 0,
  };
  // Legacy "nb+Nb"/"nb+Nlb" buttons folded byes into the no-ball count:
  // anything above the 1-run penalty is really byes / leg-byes.
  const evStr = String(body.event || "");
  if (extras.noBall > 1) {
    const extra = extras.noBall - 1;
    if (/b$/.test(evStr)) extras.bye += extra;
    else if (/lb$/.test(evStr)) extras.legBye += extra;
    extras.noBall = 1;
  }

  let wicket = null;
  if (body.is_out || body.how_out) {
    let type = body.how_out || "bowled";
    let playerOut = body.batsman_out || body.striker;
    if (type === "run_out_striker") {
      type = "run_out";
      playerOut = body.striker;
    } else if (type === "run_out_non_striker") {
      type = "run_out";
      playerOut = body.non_striker;
    }
    wicket = {
      type,
      playerOut,
      fielders: Array.isArray(body.fielders)
        ? body.fielders.map((f) => (typeof f === "object" ? f.id || f._id : f))
        : [],
    };
  }

  return {
    striker: body.striker,
    nonStriker: body.non_striker,
    bowler: body.bowler,
    batRuns: body.bat_run || 0,
    extras,
    wicket,
  };
}

/** id -> name map for every player in the match's two squads. */
async function buildPlayerNames(match) {
  const names = {};
  const squadDocs = await Players.find({
    tournamentId: match.tournament_id,
    teamId: { $in: [match.teamA_id, match.teamB_id] },
  });
  for (const doc of squadDocs) {
    for (const p of doc.players || []) names[String(p._id)] = p.name;
  }
  // Fall back to playing-XI names (keyed by generated subdoc ids).
  for (const xi of match.playingXI || []) {
    for (const p of xi.players || []) {
      if (p._id) names[String(p._id)] = p.name;
    }
  }
  return names;
}

async function loadEvents(inningId) {
  return BallEvents.find({ inning: inningId, voided: false }).sort({ sequence: 1 });
}

function toEngineEvents(docs) {
  return docs.map((d) => ({
    striker: String(d.striker),
    nonStriker: String(d.nonStriker),
    bowler: String(d.bowler),
    batRuns: d.batRuns,
    extras: {
      wide: d.extras.wide,
      noBall: d.extras.noBall,
      bye: d.extras.bye,
      legBye: d.extras.legBye,
      penalty: d.extras.penalty,
    },
    wicket: d.wicket && d.wicket.type
      ? {
          type: d.wicket.type,
          playerOut: d.wicket.playerOut ? String(d.wicket.playerOut) : undefined,
          fielders: (d.wicket.fielders || []).map(String),
        }
      : null,
  }));
}

async function getMatchAndInnings(matchId, inningNumber) {
  const match = await Match.findById(matchId).populate("tournament_id", "format");
  if (!match) throw httpError(404, "Match not found");
  const inning = await Innings.findOne({ matchId, inningNumber });
  if (!inning) throw httpError(404, "Innings not found");
  const totalOvers = match.tournament_id?.format || 20;
  return { match, inning, totalOvers };
}

function assertOwnership(match, scorerId) {
  if (String(match.createdBy) !== String(scorerId)) {
    throw httpError(403, "Only the scorer who created this match can score it");
  }
}

/** Fold the log and write the snapshot back onto the innings document. */
async function rebuildInnings(inning, totalOvers, target, names) {
  const docs = await loadEvents(inning._id);
  const state = computeInningsState(toEngineEvents(docs), {
    totalOvers,
    target,
    playerNames: names,
  });

  inning.runs = state.runs;
  inning.wickets = state.wickets;
  inning.over = Math.floor(state.legalBalls / 6);
  inning.balls = state.legalBalls % 6;
  inning.legal_balls = state.legalBalls;
  inning.current_run_rate = state.currentRunRate;
  inning.required_run_rate = state.requiredRunRate || 0;
  inning.extras = {
    wide: state.extras.wide,
    no_ball: state.extras.noBall,
    bye: state.extras.bye,
    leg_bye: state.extras.legBye,
    penalty: state.extras.penalty,
  };
  inning.batsmen = state.batsmen.map((b) => ({
    batsmanId: oid(b.id),
    name: b.name,
    runs: b.runs,
    balls: b.balls,
    fours: b.fours,
    sixes: b.sixes,
    strike_rate: b.strikeRate,
    status: b.status, // "batting" | "out" | "retired hurt" (engine vocabulary)
    how_out: b.howOut,
  }));
  inning.bowlers = state.bowlers.map((b) => ({
    bowlerId: oid(b.id),
    name: b.name,
    balls: b.balls,
    runs_conceded: b.runsConceded,
    wickets: b.wickets,
    maidens: b.maidens,
    economy: b.economy,
    extras: { wide: b.extras.wide, no_ball: b.extras.noBall },
  }));
  inning.fall_of_wickets = state.fallOfWickets.map((f) => ({
    wicket: f.wicket,
    runs: f.runs,
    playerOut: oid(f.playerOut),
    playerOutName: f.playerOutName,
    oversText: f.oversText,
  }));
  inning.per_over = state.overs;
  inning.this_over = state.thisOver;
  inning.striker = oid(state.striker);
  inning.non_striker = oid(state.nonStriker);
  inning.current_bowler = oid(state.currentBowler);
  inning.free_hit = state.freeHit;
  if (state.isComplete) inning.status = "completed";
  else if (docs.length > 0) inning.status = "inProgress";
  await inning.save();
  return state;
}

/** After an innings completes: set the target / decide the match. */
async function applyInningsEnd(match, inning, state, names) {
  if (inning.inningNumber === 1) {
    let second = await Innings.findOne({ matchId: match._id, inningNumber: 2 });
    if (!second) {
      second = await Innings.create({
        tournament: match.tournament_id?._id || match.tournament_id,
        matchId: match._id,
        inningNumber: 2,
        batting_team: inning.fielding_team,
        fielding_team: inning.batting_team,
        target: state.runs + 1,
        status: "scheduled",
      });
    } else if (!second.target) {
      second.target = state.runs + 1;
      await second.save();
    }
    match.inning_in_progress = 2;
    await match.save();
    return { secondInnings: second };
  }

  if (inning.inningNumber === 2) {
    const first = await Innings.findOne({ matchId: match._id, inningNumber: 1 });
    const firstDocs = await loadEvents(first._id);
    const firstState = computeInningsState(toEngineEvents(firstDocs), {
      totalOvers: match.tournament_id?.format || 20,
      playerNames: names,
    });
    const teamAName = match.teamA;
    const teamBName = match.teamB;
    const firstBattedA = String(first.batting_team) === String(match.teamA_id);
    const result = matchResult(firstState, state, {
      teamA: firstBattedA ? teamAName : teamBName,
      teamB: firstBattedA ? teamBName : teamAName,
    });
    if (result) {
      match.result = result.text;
      match.matchState = "completed";
      match.winner =
        result.winner === "A"
          ? first.batting_team
          : result.winner === "B"
            ? inning.batting_team
            : null;
      await match.save();
    }
    return { result };
  }
  return {};
}

async function postBall(matchId, inningNumber, rawBody, scorerId) {
  const { match, inning, totalOvers } = await getMatchAndInnings(matchId, inningNumber);
  assertOwnership(match, scorerId);
  if (inning.status === "completed") throw httpError(422, "Innings is already completed");
  if (match.matchState === "completed") throw httpError(422, "Match is already completed");

  const names = await buildPlayerNames(match);
  const ev = normalizeEvent(rawBody);

  const count = await BallEvents.countDocuments({ inning: inning._id, voided: false });
  const doc = await BallEvents.create({
    inning: inning._id,
    sequence: count + 1,
    striker: oid(ev.striker),
    nonStriker: oid(ev.nonStriker),
    bowler: oid(ev.bowler),
    batRuns: ev.batRuns,
    extras: ev.extras,
    wicket:
      ev.wicket && ev.wicket.type
        ? {
            type: ev.wicket.type,
            playerOut: oid(ev.wicket.playerOut) || oid(ev.striker),
            fielders: (ev.wicket.fielders || []).map(oid).filter(Boolean),
          }
        : { type: null },
    names: {
      striker: names[String(ev.striker)],
      nonStriker: names[String(ev.nonStriker)],
      bowler: names[String(ev.bowler)],
      playerOut: ev.wicket ? names[String(ev.wicket.playerOut || ev.striker)] : undefined,
    },
    commentary: describeBall(ev, ev.extras, names),
  });

  let state;
  try {
    state = await rebuildInnings(inning, totalOvers, inning.target || null, names);
  } catch (err) {
    // Engine rejected the sequence: pull the ball back out of the log.
    await BallEvents.findByIdAndDelete(doc._id);
    throw httpError(422, err.message);
  }

  if (match.matchState !== "live") {
    match.matchState = "live";
    await match.save();
  }

  let endInfo = {};
  if (state.isComplete) {
    endInfo = await applyInningsEnd(match, inning, state, names);
  }
  return { match, inning, state, ballEvent: doc, ...endInfo };
}

async function undoLastBall(matchId, inningNumber, scorerId) {
  const { match, inning, totalOvers } = await getMatchAndInnings(matchId, inningNumber);
  assertOwnership(match, scorerId);

  const last = await BallEvents.findOne({ inning: inning._id, voided: false }).sort({
    sequence: -1,
  });
  if (!last) throw httpError(422, "No ball to undo");
  last.voided = true;
  await last.save();

  // Reopening a completed match/innings when the winning ball is undone.
  if (inning.status === "completed") inning.status = "inProgress";
  if (inning.inningNumber === 2 && match.matchState === "completed") {
    match.matchState = "live";
    match.result = undefined;
    match.winner = undefined;
    await match.save();
  }

  const names = await buildPlayerNames(match);
  const state = await rebuildInnings(inning, totalOvers, inning.target || null, names);
  return { match, inning, state, undone: last };
}

async function getInningsState(matchId, inningNumber) {
  const { match, inning, totalOvers } = await getMatchAndInnings(matchId, inningNumber);
  const names = await buildPlayerNames(match);
  const docs = await loadEvents(inning._id);
  const state = computeInningsState(toEngineEvents(docs), {
    totalOvers,
    target: inning.target || null,
    playerNames: names,
  });
  return { match, inning, state, events: docs };
}

module.exports = {
  postBall,
  undoLastBall,
  getInningsState,
  normalizeEvent,
  buildPlayerNames,
  loadEvents,
  toEngineEvents,
};
