/**
 * CricScore scoring engine — event-sourced.
 *
 * Every innings figure (score, batsman/bowler stats, run rates, fall of
 * wickets, Manhattan data) is DERIVED by folding the ball-by-ball event
 * log. Nothing is a mutated counter, so the scorecard can never drift
 * from the log, and undo/edit is simply "re-fold without/with the event".
 *
 * Event shape (one delivery):
 * {
 *   striker:    playerId,          // batsman facing
 *   nonStriker: playerId,          // batsman at the other end
 *   bowler:     playerId,
 *   batRuns:    0..6+              // runs off the bat (also runs run on a no-ball)
 *   extras: { wide, noBall, bye, legBye, penalty },  // run values, not counts
 *   wicket: null | {
 *     type: 'bowled'|'caught'|'caught_and_bowled'|'lbw'|'stumped'|
 *           'hit_wicket'|'run_out'|'retired_hurt'|'retired_out'|
 *           'obstructing'|'hit_ball_twice'|'timed_out',
 *     playerOut: playerId,         // defaults to striker
 *     fielders: [playerId],        // credited fielders (catch/stump/run out)
 *   }
 * }
 *
 * Config: { totalOvers, target = null, freeHit = true, playerNames = {} }
 * playerNames maps id -> display name for dismissal text.
 */

const BOWLER_WICKETS = new Set([
  "bowled",
  "caught",
  "caught_and_bowled",
  "lbw",
  "stumped",
  "hit_wicket",
]);

// Dismissals NOT possible on a free hit (only run out / obstructing /
// hit the ball twice / retired out are).
const FREE_HIT_BARRED = new Set([
  "bowled",
  "caught",
  "caught_and_bowled",
  "lbw",
  "stumped",
  "hit_wicket",
]);

// Dismissals that CAN happen on a wide / a no-ball. Everything else is a
// scoring impossibility (you cannot be bowled off a wide, or stumped off
// a no-ball) and is rejected to protect the log from mis-taps.
const WIDE_DISMISSALS = new Set([
  "stumped",
  "run_out",
  "obstructing",
  "hit_ball_twice",
  "retired_hurt",
  "retired_out",
  "timed_out",
]);
const NO_BALL_DISMISSALS = new Set([
  "run_out",
  "obstructing",
  "hit_ball_twice",
  "retired_hurt",
  "retired_out",
  "timed_out",
]);

const WICKET_TYPES = new Set([
  ...BOWLER_WICKETS,
  "run_out",
  "retired_hurt",
  "retired_out",
  "obstructing",
  "hit_ball_twice",
  "timed_out",
]);

function engineError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const round2 = (n) => Math.round(n * 100) / 100;
const oversText = (legalBalls) => `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;

function extrasOf(ev) {
  const e = ev.extras || {};
  return {
    wide: e.wide || 0,
    noBall: e.noBall || 0,
    bye: e.bye || 0,
    legBye: e.legBye || 0,
    penalty: e.penalty || 0,
  };
}

function isLegalDelivery(ex) {
  return ex.wide === 0 && ex.noBall === 0;
}

/** Runs the batsmen physically cross for (decides strike rotation). */
function crossingRuns(ev, ex) {
  // Wide penalty run is not a crossing; every other run involves crossing.
  return (ev.batRuns || 0) + ex.bye + ex.legBye + Math.max(0, ex.wide - 1);
}

function dismissalText(type, ev, names) {
  const bowler = names[ev.bowler] || "Bowler";
  const f = (ev.wicket.fielders || []).map((id) => names[id] || "sub");
  switch (type) {
    case "bowled":
      return `b ${bowler}`;
    case "caught":
      return `c ${f[0] || "sub"} b ${bowler}`;
    case "caught_and_bowled":
      return `c & b ${bowler}`;
    case "lbw":
      return `lbw b ${bowler}`;
    case "stumped":
      return `st ${f[0] || "sub"} b ${bowler}`;
    case "hit_wicket":
      return `hit wicket b ${bowler}`;
    case "run_out":
      return `run out (${f.join("/") || "sub"})`;
    case "retired_hurt":
      return "retired hurt";
    case "retired_out":
      return "retired out";
    case "obstructing":
      return "obstructing the field";
    case "hit_ball_twice":
      return "hit the ball twice";
    case "timed_out":
      return "timed out";
    default:
      return type;
  }
}

/** Short symbol for the "this over" strip and ball-by-ball displays. */
function ballSymbol(ev, ex) {
  const total = (ev.batRuns || 0) + ex.wide + ex.noBall + ex.bye + ex.legBye + ex.penalty;
  if (ev.wicket && ev.wicket.type !== "retired_hurt") {
    return total > 0 ? `${total}W` : "W";
  }
  if (ex.wide > 0) return ex.wide === 1 ? "Wd" : `${ex.wide - 1}Wd`;
  if (ex.noBall > 0) return ev.batRuns > 0 ? `${ev.batRuns}Nb` : "Nb";
  if (ex.bye > 0) return `${ex.bye}b`;
  if (ex.legBye > 0) return `${ex.legBye}lb`;
  if (ev.batRuns === 0) return "•";
  return String(ev.batRuns);
}

/** One-line factual commentary for an event. */
function describeBall(ev, ex, names) {
  const bowler = names[ev.bowler] || "Bowler";
  const striker = names[ev.striker] || "Batsman";
  let desc;
  if (ev.wicket) {
    const outName = names[ev.wicket.playerOut || ev.striker] || "Batsman";
    desc =
      ev.wicket.type === "retired_hurt"
        ? `${outName} retires hurt`
        : `OUT, ${outName} ${dismissalText(ev.wicket.type, ev, names)}`;
    const ran = crossingRuns(ev, ex);
    if (ev.wicket.type === "run_out" && ran > 0) desc += `, ${ran} run${ran > 1 ? "s" : ""} completed`;
  } else if (ex.wide > 0) {
    desc = ex.wide === 1 ? "wide" : `${ex.wide} wides`;
  } else if (ex.noBall > 0) {
    desc = `no ball${ev.batRuns ? `, ${ev.batRuns} run${ev.batRuns > 1 ? "s" : ""}` : ""}`;
  } else if (ex.bye > 0) {
    desc = `${ex.bye} bye${ex.bye > 1 ? "s" : ""}`;
  } else if (ex.legBye > 0) {
    desc = `${ex.legBye} leg bye${ex.legBye > 1 ? "s" : ""}`;
  } else if (ev.batRuns === 4) {
    desc = "FOUR";
  } else if (ev.batRuns === 6) {
    desc = "SIX";
  } else if (ev.batRuns === 0) {
    desc = "no run";
  } else {
    desc = `${ev.batRuns} run${ev.batRuns > 1 ? "s" : ""}`;
  }
  return `${bowler} to ${striker}, ${desc}`;
}

/**
 * Fold an event log into the complete innings state.
 * Throws engineError on an invalid event sequence.
 */
function computeInningsState(events, config = {}) {
  const totalOvers = config.totalOvers || 20;
  const maxBalls = totalOvers * 6;
  const target = config.target || null;
  const freeHitEnabled = config.freeHit !== false;
  const names = config.playerNames || {};
  const maxBowlerBalls = Math.ceil(totalOvers / 5) * 6;

  const state = {
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, penalty: 0, total: 0 },
    batsmen: [], // in batting order
    bowlers: [],
    fallOfWickets: [],
    overs: [], // { over, runs, wickets } per completed/current over (Manhattan)
    thisOver: [], // ball symbols in the current over
    currentPair: null, // { striker, nonStriker, runs, balls }
    freeHit: false, // next delivery is a free hit
    isComplete: false,
    ballsBowled: events.length,
  };

  const batById = new Map();
  const bowlById = new Map();
  let partnership = null; // { members, runs, balls }
  const partnerships = []; // completed stands, in order
  let overBowler = null; // bowler of the current over
  let prevOverBowler = null;
  let overBalls = []; // events of the current over (for maidens)
  // Who stands at each end for the NEXT ball (null = vacant after a wicket,
  // filled by whichever new batsman the next event names).
  const crease = { striker: null, nonStriker: null };

  const getBatsman = (id) => {
    if (!batById.has(id)) {
      const b = {
        id,
        name: names[id] || "Unknown",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        status: "batting",
        howOut: "",
        order: batById.size + 1,
      };
      batById.set(id, b);
      state.batsmen.push(b);
    }
    return batById.get(id);
  };

  const getBowler = (id) => {
    if (!bowlById.has(id)) {
      const b = {
        id,
        name: names[id] || "Unknown",
        balls: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        dotBalls: 0,
        economy: 0,
        oversText: "0.0",
        extras: { wide: 0, noBall: 0 },
      };
      bowlById.set(id, b);
      state.bowlers.push(b);
    }
    return bowlById.get(id);
  };

  events.forEach((ev, idx) => {
    if (state.isComplete) {
      throw engineError("INNINGS_COMPLETE", `Ball ${idx + 1}: innings is already complete`);
    }
    const ex = extrasOf(ev);
    const batRuns = ev.batRuns || 0;
    const runValues = [batRuns, ex.wide, ex.noBall, ex.bye, ex.legBye, ex.penalty];
    if (runValues.some((v) => !Number.isInteger(v) || v < 0)) {
      throw engineError("INVALID_EVENT", `Ball ${idx + 1}: runs must be non-negative integers`);
    }
    if (!ev.striker || !ev.nonStriker || !ev.bowler) {
      throw engineError("INVALID_EVENT", `Ball ${idx + 1}: striker, nonStriker and bowler are required`);
    }
    if (ev.striker === ev.nonStriker) {
      throw engineError("SAME_BATSMEN", `Ball ${idx + 1}: striker and non-striker are the same player`);
    }

    const striker = getBatsman(ev.striker);
    const nonStriker = getBatsman(ev.nonStriker);
    if (striker.status === "out" || nonStriker.status === "out") {
      throw engineError("PLAYER_OUT", `Ball ${idx + 1}: a dismissed batsman cannot bat again`);
    }
    // A retired-hurt batsman walking back in is legal.
    if (striker.status === "retired hurt") striker.status = "batting";
    if (nonStriker.status === "retired hurt") nonStriker.status = "batting";

    const bowler = getBowler(ev.bowler);

    // Adopt the declared pair into any vacant crease end (openers, or the
    // new batsman after a wicket).
    if (crease.striker === null) crease.striker = ev.striker;
    if (crease.nonStriker === null) crease.nonStriker = ev.nonStriker;

    // Over/bowler bookkeeping: an empty overBalls means a fresh over.
    if (overBalls.length === 0) {
      if (prevOverBowler && ev.bowler === prevOverBowler) {
        throw engineError("BOWLER_CONSECUTIVE_OVER", `Ball ${idx + 1}: a bowler cannot bowl two overs in a row`);
      }
      overBowler = ev.bowler;
    } else if (ev.bowler !== overBowler) {
      throw engineError("BOWLER_CHANGED_MID_OVER", `Ball ${idx + 1}: bowler changed mid-over`);
    }
    if (bowler.balls >= maxBowlerBalls && isLegalDelivery(ex)) {
      throw engineError("BOWLER_MAX_OVERS", `Ball ${idx + 1}: bowler has bowled their maximum overs`);
    }

    // Free-hit validation.
    const thisIsFreeHit = state.freeHit;
    if (thisIsFreeHit && ev.wicket && FREE_HIT_BARRED.has(ev.wicket.type)) {
      throw engineError("FREE_HIT_WICKET", `Ball ${idx + 1}: ${ev.wicket.type} is not possible on a free hit`);
    }
    if (ev.wicket && !WICKET_TYPES.has(ev.wicket.type)) {
      throw engineError("INVALID_EVENT", `Ball ${idx + 1}: unknown wicket type ${ev.wicket.type}`);
    }
    // A dismissal must be physically possible on this delivery.
    if (ev.wicket) {
      if (ex.wide > 0 && !WIDE_DISMISSALS.has(ev.wicket.type)) {
        throw engineError(
          "INVALID_DISMISSAL",
          `Ball ${idx + 1}: ${ev.wicket.type} is not possible on a wide ball`
        );
      }
      if (ex.noBall > 0 && !NO_BALL_DISMISSALS.has(ev.wicket.type)) {
        throw engineError(
          "INVALID_DISMISSAL",
          `Ball ${idx + 1}: ${ev.wicket.type} is not possible on a no-ball`
        );
      }
    }

    const totalRuns = batRuns + ex.wide + ex.noBall + ex.bye + ex.legBye + ex.penalty;
    const legal = isLegalDelivery(ex);

    // Team totals.
    state.runs += totalRuns;
    state.extras.wide += ex.wide;
    state.extras.noBall += ex.noBall;
    state.extras.bye += ex.bye;
    state.extras.legBye += ex.legBye;
    state.extras.penalty += ex.penalty;
    if (legal) state.legalBalls += 1;

    // Batsman figures. A wide is never a ball faced; a no-ball is.
    striker.runs += batRuns;
    if (ex.wide === 0) striker.balls += 1;
    if (batRuns === 4 && ex.bye === 0 && ex.legBye === 0) striker.fours += 1;
    if (batRuns === 6 && ex.bye === 0 && ex.legBye === 0) striker.sixes += 1;

    // Bowler figures. Byes/leg-byes are not charged to the bowler.
    const conceded = batRuns + ex.wide + ex.noBall;
    bowler.runsConceded += conceded;
    if (legal) bowler.balls += 1;
    if (totalRuns === 0) bowler.dotBalls += 1;
    bowler.extras.wide += ex.wide;
    bowler.extras.noBall += ex.noBall;

    // Partnership.
    if (
      !partnership ||
      !partnership.members.includes(ev.striker) ||
      !partnership.members.includes(ev.nonStriker)
    ) {
      partnership = { members: [ev.striker, ev.nonStriker], runs: 0, balls: 0 };
    }
    partnership.runs += totalRuns;
    if (ex.wide === 0) partnership.balls += 1;

    // Per-over (Manhattan) + this-over strip.
    const overIdx = Math.floor((state.legalBalls - (legal ? 1 : 0)) / 6);
    if (!state.overs[overIdx]) state.overs[overIdx] = { over: overIdx + 1, runs: 0, wickets: 0 };
    state.overs[overIdx].runs += totalRuns;
    state.thisOver.push(ballSymbol(ev, ex));
    overBalls.push({ ev, ex, conceded });

    // Wicket handling.
    if (ev.wicket) {
      const type = ev.wicket.type;
      const outId = ev.wicket.playerOut || ev.striker;
      const outBat = getBatsman(outId);
      if (type === "retired_hurt") {
        outBat.status = "retired hurt";
        outBat.howOut = "retired hurt";
      } else {
        state.wickets += 1;
        state.overs[overIdx].wickets += 1;
        outBat.status = "out";
        outBat.howOut = dismissalText(type, ev, names);
        if (BOWLER_WICKETS.has(type)) bowler.wickets += 1;
        state.fallOfWickets.push({
          wicket: state.wickets,
          runs: state.runs,
          playerOut: outId,
          playerOutName: names[outId] || outBat.name,
          oversText: oversText(state.legalBalls),
        });
      }
      // Close out the partnership record before the pair breaks.
      if (partnership) {
        partnerships.push({
          batsmen: partnership.members.map((id) => ({ id, name: names[id] || "Unknown" })),
          runs: partnership.runs,
          balls: partnership.balls,
          wicket: type === "retired_hurt" ? null : state.wickets,
          retiredHurt: type === "retired_hurt",
          ongoing: false,
        });
      }
      partnership = null; // pair broken; rebuilt on next ball

      // Crease: on a run out the batsmen may have crossed before the
      // dismissal, so apply the crossing first; for every other dismissal
      // (and retired hurt) the departing batsman's end simply vacates.
      if (type === "run_out" && crossingRuns(ev, ex) % 2 === 1) {
        [crease.striker, crease.nonStriker] = [crease.nonStriker, crease.striker];
      }
      if (crease.striker === outId) crease.striker = null;
      if (crease.nonStriker === outId) crease.nonStriker = null;
    } else if (crossingRuns(ev, ex) % 2 === 1) {
      // Odd number of crossings: batsmen change ends.
      [crease.striker, crease.nonStriker] = [crease.nonStriker, crease.striker];
    }

    // End of over: maiden check + strip reset.
    if (legal && state.legalBalls % 6 === 0) {
      const overConceded = overBalls.reduce((s, b) => s + b.conceded, 0);
      if (overConceded === 0 && overBalls.every((b) => b.ev.bowler === overBowler)) {
        getBowler(overBowler).maidens += 1;
      }
      prevOverBowler = overBowler;
      overBalls = [];
      state.thisOver = [];
      state.lastOverBowler = prevOverBowler;
      // Batsmen change ends for the new over.
      [crease.striker, crease.nonStriker] = [crease.nonStriker, crease.striker];
    }

    // Free hit: set by a no-ball, consumed by the next delivery unless that
    // delivery is itself a wide/no-ball (free hit carries over in T20/ODI).
    if (freeHitEnabled) {
      if (ex.noBall > 0) state.freeHit = true;
      else if (state.freeHit && legal) state.freeHit = false;
    }

    // Completion.
    if (state.wickets >= 10 || state.legalBalls >= maxBalls || (target && state.runs >= target)) {
      state.isComplete = true;
    }
  });

  // Derived rates (fractional overs done properly).
  const oversFraction = state.legalBalls / 6;
  state.oversText = oversText(state.legalBalls);
  state.currentRunRate = oversFraction > 0 ? round2(state.runs / oversFraction) : 0;
  if (target) {
    state.target = target;
    const remainingBalls = maxBalls - state.legalBalls;
    const needed = target - state.runs;
    state.runsNeeded = Math.max(needed, 0);
    state.ballsRemaining = remainingBalls;
    state.requiredRunRate =
      needed > 0 && remainingBalls > 0 ? round2(needed / (remainingBalls / 6)) : 0;
    state.projectedScore = null;
  } else {
    state.runsNeeded = null;
    state.ballsRemaining = maxBalls - state.legalBalls;
    state.requiredRunRate = null;
    state.projectedScore =
      oversFraction > 0 ? Math.round(state.currentRunRate * totalOvers) : null;
  }
  state.extras.total =
    state.extras.wide + state.extras.noBall + state.extras.bye + state.extras.legBye + state.extras.penalty;
  state.winProbability = target ? winProbability(state, totalOvers) : null;

  for (const b of state.batsmen) {
    b.strikeRate = b.balls > 0 ? round2((b.runs / b.balls) * 100) : 0;
  }
  for (const b of state.bowlers) {
    b.oversText = oversText(b.balls);
    b.economy = b.balls > 0 ? round2(b.runsConceded / (b.balls / 6)) : 0;
  }
  if (partnership) {
    state.currentPair = {
      striker: crease.striker,
      nonStriker: crease.nonStriker,
      runs: partnership.runs,
      balls: partnership.balls,
    };
    partnerships.push({
      batsmen: partnership.members.map((id) => ({ id, name: names[id] || "Unknown" })),
      runs: partnership.runs,
      balls: partnership.balls,
      wicket: null,
      retiredHurt: false,
      ongoing: true,
    });
  }
  state.partnerships = partnerships;
  state.striker = crease.striker;
  state.nonStriker = crease.nonStriker;
  state.awaitingBatsman =
    !state.isComplete && events.length > 0 && (crease.striker === null || crease.nonStriker === null);
  state.currentBowler = overBowler;
  return state;
}

/**
 * Win probability for a chase — heuristic model v1.
 * Blends a momentum projection (current run rate carried forward) with a
 * resource projection (par rate for the format), both discounted by
 * wickets in hand, then maps the projected margin through a logistic.
 * Returns { batting, bowling } as percentages, or null when not chasing.
 */
function winProbability(state, totalOvers) {
  if (!state || state.runsNeeded == null || state.target == null) return null;
  const target = state.target;
  if (state.isComplete) {
    return state.runs >= target
      ? { batting: 100, bowling: 0 }
      : { batting: 0, bowling: 100 };
  }
  const ballsLeft = state.ballsRemaining ?? 0;
  const wicketsLeft = 10 - state.wickets;
  if (ballsLeft <= 0 || wicketsLeft <= 0) return null;

  const parRR = totalOvers <= 10 ? 9 : totalOvers <= 20 ? 8 : totalOvers <= 40 ? 6.2 : 5.8;
  const wicketFactor = 0.45 + 0.55 * (wicketsLeft / 10);
  const oversLeft = ballsLeft / 6;
  const momentumProj = state.runs + state.currentRunRate * oversLeft * wicketFactor;
  const resourceProj = state.runs + parRR * oversLeft * wicketFactor;
  const w = Math.min(1, state.legalBalls / 30); // trust momentum more as the innings settles
  const projected = w * momentumProj + (1 - w) * resourceProj;
  const scale = Math.max(6, target * 0.09);
  const p = 1 / (1 + Math.exp(-(projected - target) / scale));
  const batting = Math.max(1, Math.min(99, Math.round(p * 100)));
  return { batting, bowling: 100 - batting };
}

/**
 * Match result from two completed innings states.
 * names: { teamA: "Name", teamB: "Name" } where teamA batted first.
 */
function matchResult(inn1, inn2, names) {
  if (!inn1 || !inn2 || !inn2.isComplete) return null;
  const a = names.teamA || "Team A";
  const b = names.teamB || "Team B";
  if (inn2.runs > inn1.runs) {
    const wkts = 10 - inn2.wickets;
    const ballsLeft = (inn2.ballsRemaining ?? 0);
    return {
      winner: "B",
      text: `${b} won by ${wkts} wicket${wkts === 1 ? "" : "s"} (${ballsLeft} ball${ballsLeft === 1 ? "" : "s"} remaining)`,
    };
  }
  if (inn1.runs > inn2.runs) {
    const margin = inn1.runs - inn2.runs;
    return { winner: "A", text: `${a} won by ${margin} run${margin === 1 ? "" : "s"}` };
  }
  return { winner: null, text: "Match tied" };
}

module.exports = {
  computeInningsState,
  matchResult,
  winProbability,
  describeBall,
  ballSymbol,
  dismissalText,
  oversText,
  BOWLER_WICKETS,
};
