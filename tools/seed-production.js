/**
 * Seed the production CricScore deployment with a complete sample
 * tournament, played ball-by-ball through the real API (the same calls
 * the scorer console makes). Creates: 1 tournament, 4 teams with squads,
 * 2 completed matches, 1 live match mid-chase, 1 upcoming match.
 *
 * Usage: node tools/seed-production.js
 * Idempotent-ish: uses the demo scorer account; if the tournament
 * already exists (by name) it stops instead of duplicating.
 */
const API = process.env.CRICSCORE_API || "https://cricscore-api-rmya.onrender.com";
const ROOT = `${API}/api/cricscore`;

const SCORER = {
  fullName: "CricScore Demo Scorer",
  email: "demo@cricscore.app",
  password: "CricScore@2026",
};

let cookie = "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, path, body, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${ROOT}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      const json = await res.json().catch(() => ({}));
      if (res.status === 429 || res.status === 502 || res.status === 503) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, json };
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(2500);
    }
  }
}

/* ------------------------------ ball generator ----------------------------- */
// Small deterministic PRNG so the seeded tournament is reproducible.
let seed = 20261020;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function genBall(state, ctx) {
  const freeHit = state.freeHit || state.free_hit;
  const wicketsDown = state.wickets || 0;
  // Keep tail-end collapses rare so innings usually use most overs.
  const wicketP = wicketsDown >= 7 ? 0.015 : 0.038;
  const r = rnd();
  const base = { batRuns: 0, extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, penalty: 0 }, wicket: null };

  if (r < 0.02) {
    base.extras.wide = 1 + (rnd() < 0.25 ? 1 : 0);
    if (rnd() < 0.06) {
      base.wicket = { type: pick(["stumped", "run_out"]), playerOut: ctx.striker, fielders: [pick(ctx.fieldingXI)] };
    }
    return base;
  }
  if (r < 0.028) {
    base.extras.noBall = 1;
    base.batRuns = pick([0, 0, 1, 1, 2, 4]);
    if (rnd() < 0.05) {
      base.wicket = { type: "run_out", playerOut: rnd() < 0.7 ? ctx.striker : ctx.nonStriker, fielders: [pick(ctx.fieldingXI)] };
    }
    return base;
  }
  if (r < 0.028 + wicketP) {
    const types = freeHit
      ? ["run_out"]
      : ["bowled", "caught", "caught", "caught", "lbw", "stumped", "hit_wicket", "run_out"];
    const type = pick(types);
    const fielders =
      type === "caught" ? [pick(ctx.fieldingXI)]
      : type === "stumped" ? [ctx.fieldingXI[1] || pick(ctx.fieldingXI)]
      : type === "run_out" ? [pick(ctx.fieldingXI)]
      : [];
    base.batRuns = type === "run_out" ? pick([0, 1]) : 0;
    base.wicket = {
      type,
      playerOut: type === "run_out" && rnd() < 0.25 ? ctx.nonStriker : ctx.striker,
      fielders,
    };
    return base;
  }
  const table = [
    [0.30, 0], [0.64, 1], [0.76, 2], [0.78, 3], [0.90, 4], [1.0, 6],
  ];
  for (const [p, runs] of table) {
    if (r < 0.028 + wicketP + (1 - 0.028 - wicketP) * p) {
      base.batRuns = runs;
      return base;
    }
  }
  base.batRuns = 1;
  return base;
}

/** Constraint-safe bowler choice: least-used eligible (not the previous
 * over's bowler, not maxed out). Balancing usage can never deadlock
 * while a legal rotation exists. */
function chooseBowler(state, fieldingXI) {
  const maxBalls = Math.ceil((state.totalOvers || 10) / 5) * 6;
  const used = new Map((state.bowlers || []).map((b) => [String((b.id ?? b.bowlerId)), b.balls]));
  const last = state.lastOverBowler ? String(state.lastOverBowler) : null;
  const eligible = fieldingXI.filter(
    (id) => String(id) !== last && (used.get(String(id)) || 0) < maxBalls
  );
  if (!eligible.length) return null;
  eligible.sort((x, y) => (used.get(String(x)) || 0) - (used.get(String(y)) || 0));
  return eligible[0];
}

function bowlerLegal(state, fieldingXI, bowlerId) {
  const maxBalls = Math.ceil((state.totalOvers || 10) / 5) * 6;
  const used = new Map((state.bowlers || []).map((b) => [String((b.id ?? b.bowlerId)), b.balls]));
  return (used.get(String(bowlerId)) || 0) < maxBalls;
}

/** Play one innings through the API. Resumes from live state if the
 * innings is already in progress. Stops early at stopAtLegalBalls. */
async function playInnings(matchId, inningNumber, battingXI, fieldingXI, stopAtLegalBalls = Infinity) {
  const ctx = {
    striker: battingXI[0],
    nonStriker: battingXI[1],
    bowler: fieldingXI[fieldingXI.length - 1],
    fieldingXI,
    battingXI,
  };
  // Resume support: fetch current state first.
  let state = null;
  const existing = await req("GET", `/ballByball/${matchId}/state?inningNumber=${inningNumber}`);
  if (existing.status < 400 && existing.json.state) {
    state = existing.json.state;
    if (state.isComplete) return state;
    if (state.legalBalls >= stopAtLegalBalls) return state;
    if (state.currentPair) {
      ctx.striker = state.currentPair.striker;
      ctx.nonStriker = state.currentPair.nonStriker;
    }
    const events = existing.json.events || [];
    if (events.length && state.legalBalls % 6 !== 0) {
      ctx.bowler = events[events.length - 1].bowler;
    } else if (events.length) {
      ctx.bowler = chooseBowler(state, fieldingXI) || ctx.bowler;
    }
    if (state.awaitingBatsman) {
      const nextIn = (state.yetToBat || [])[0];
      const fow = state.fallOfWickets || [];
      const outId = fow.length ? fow[fow.length - 1].playerOut : null;
      if (nextIn) {
        if (String(ctx.striker) === String(outId) || !state.currentPair) ctx.striker = nextIn;
        if (String(ctx.nonStriker) === String(outId)) ctx.nonStriker = nextIn;
      }
    }
    console.log(`    resuming inn${inningNumber} at ${state.runs}/${state.wickets} (${state.oversText})`);
  }
  let guard = 0;
  while (guard++ < 400) {
    // Pre-flight: at an over start the current bowler must be legal.
    if (state && state.legalBalls > 0 && state.legalBalls % 6 === 0) {
      const last = state.lastOverBowler ? String(state.lastOverBowler) : null;
      if (String(ctx.bowler) === last || !bowlerLegal(state, fieldingXI, ctx.bowler)) {
        ctx.bowler = chooseBowler(state, fieldingXI) || ctx.bowler;
      }
    }
    const fragment = genBall(state || { wickets: 0 }, ctx);
    const payload = {
      inningNumber,
      striker: ctx.striker,
      nonStriker: ctx.nonStriker,
      bowler: ctx.bowler,
      batRuns: fragment.batRuns,
      extras: fragment.extras,
      wicket: fragment.wicket,
    };
    const { status, json } = await req("POST", `/ballByball/${matchId}`, payload);
    if (status >= 400 || !json.state) {
      throw new Error(`Ball rejected (${status}): ${JSON.stringify(json).slice(0, 200)} payload=${JSON.stringify(payload)}`);
    }
    state = json.state;
    await sleep(50);

    if (state.isComplete) break;
    if (state.legalBalls >= stopAtLegalBalls) break;

    // Crease: trust the engine's current pair when present.
    if (state.currentPair) {
      ctx.striker = state.currentPair.striker;
      ctx.nonStriker = state.currentPair.nonStriker;
    }
    // New batsman for the empty end.
    if (state.awaitingBatsman) {
      const nextIn = (state.yetToBat || [])[0];
      if (!nextIn) break; // all out edge
      const fow = state.fallOfWickets || [];
      const outId = fow.length ? fow[fow.length - 1].playerOut : null;
      if (String(ctx.striker) === String(outId) || !state.currentPair) ctx.striker = nextIn;
      if (String(ctx.nonStriker) === String(outId)) ctx.nonStriker = nextIn;
      if (String(ctx.striker) === String(ctx.nonStriker)) ctx.nonStriker = nextIn;
    }
    // New bowler at over end — and a pre-flight guard at any over start.
    const overDone = state.legalBalls > 0 && state.legalBalls % 6 === 0;
    if (overDone && !state.isComplete) {
      ctx.bowler = chooseBowler(state, fieldingXI) || ctx.bowler;
    }
  }
  return state;
}

/* --------------------------------- data ---------------------------------- */
const TEAMS = [
  { name: "Urlabari Warriors", players: ["Aashish Rai", "Bibek Limbu", "Sagar Thapa", "Dipesh Karki", "Rohan Shrestha", "Anil Tamang", "Prakash Magar", "Nabin Gurung", "Suman Basnet", "Kiran Adhikari", "Milan Bhandari", "Roshan Khadka", "Suraj Chaudhary"] },
  { name: "Damak Rhinos", players: ["Nischal Shrestha", "Pradip Bhattarai", "Utsav Regmi", "Sajan Maharjan", "Bibash Pokharel", "Ritesh Shiwakoti", "Aashutosh Ghimire", "Sandesh Parajuli", "Manish Dangal", "Yogesh Neupane", "Krishna Bista", "Dipak Oli", "Saroj Thapa"] },
  { name: "Itahari Thunder", players: ["Hari Prasad Sharma", "Bikash Kharel", "Sunil Marasini", "Pawan Bhatta", "Aashik Hussain", "Bhim Bahadur Rana", "Devendra Joshi", "Nabin Yadav", "Rijan Kharel", "Suraj Mandal", "Kamal Airee", "Tulsi Thapa", "Hem Raj Dhami"] },
  { name: "Biratnagar Titans", players: ["Rajan Karki", "Sagar Rimal", "Bhuwan Shrestha", "Avinash Karn", "Rupak Baral", "Sushan Bhari", "Jitendra Shah", "Manoj Tamang", "Pradeep Paswan", "Yubraj Khatri", "Sagar Mishra", "Naren Bhatta", "Santosh Karki"] },
];

async function main() {
  console.log("Waking API…");
  await req("GET", "/view/tournaments");

  console.log("Scorer account…");
  let r = await req("POST", "/scorer/signup", SCORER);
  // Signup creates the account but issues no session cookie — always log in.
  r = await req("POST", "/scorer/login", { email: SCORER.email, password: SCORER.password });
  if (r.status >= 400 || !cookie) throw new Error(`Login failed: ${JSON.stringify(r.json)}`);
  const scorerId = r.json.user?._id || r.json.user?.id;
  if (!scorerId) throw new Error(`No scorer id in login response: ${JSON.stringify(r.json).slice(0, 200)}`);

  console.log("Tournament…");
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const plus = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return d; };
  const mine = await req("GET", "/tournament/");
  let tour = (mine.json.data || []).find((t) => t.tournament_name === "Urlabari Premier League 2026");
  if (!tour) {
    r = await req("POST", "/tournament/create", {
      tournament_name: "Urlabari Premier League 2026",
      start_date: iso(plus(0)),
      end_date: iso(plus(14)),
      venue: "Urlabari Ground, Morang",
      location: "Urlabari, Koshi Province",
      format: 10,
      organizer: "Urlabari Cricket Club",
      description: "Season 3 of the Urlabari Premier League — ten-over league cricket featuring the best club sides in Koshi Province.",
    });
    if (r.status >= 400) throw new Error(`Tournament create failed: ${JSON.stringify(r.json).slice(0, 200)}`);
    const again = await req("GET", "/tournament/");
    tour = (again.json.data || []).find((t) => t.tournament_name === "Urlabari Premier League 2026");
  }
  const tourId = tour?._id;
  if (!tourId) throw new Error("Could not resolve tournament id");
  console.log("  tournament:", tourId);

  console.log("Teams + squads…");
  const teamIds = [];
  const squads = {}; // teamId -> [playerIds]
  const squadNames = {}; // teamId -> [names] (same order as squads)
  const teamsNow = await req("GET", `/tournament/${tourId}/teams`);
  const existingTeams = new Map(((teamsNow.json.data || [])).map((t) => [t.teamName || t.name, String(t._id)]));
  for (const team of TEAMS) {
    let teamId = existingTeams.get(team.name);
    if (!teamId) {
      r = await req("POST", `/tournament/${tourId}/teams`, { teamName: team.name });
      if (r.status >= 400) throw new Error(`Team create failed: ${JSON.stringify(r.json).slice(0, 200)}`);
      const after = await req("GET", `/tournament/${tourId}/teams`);
      teamId = String(((after.json.data || []).find((t) => (t.teamName || t.name) === team.name) || {})._id || "");
    }
    if (!teamId) throw new Error(`Could not resolve team id for ${team.name}`);
    teamIds.push(teamId);
    r = await req("POST", "/players", {
      tourId,
      teamId,
      players: team.players.map((name) => ({ name })),
    });
    if (r.status >= 400 && !/already added/i.test(JSON.stringify(r.json))) {
      throw new Error(`Players add failed: ${JSON.stringify(r.json).slice(0, 200)}`);
    }
    r = await req("GET", `/players/${tourId}/${teamId}`);
    // Response: { players: [ { players: [ ...subdocs ] } ] }
    const docs = r.json?.players || [];
    const list = docs[0]?.players || r.json?.data?.players || [];
    squads[teamId] = list.map((p) => String(p._id));
    squadNames[teamId] = list.map((p) => p.name);
    if (squads[teamId].length < 11) throw new Error(`Squad too small for ${team.name}: ${squads[teamId].length}`);
    console.log(`  ${team.name}: ${squads[teamId].length} players`);
  }

  async function playMatch(idx, a, b, dateOffset, time, { finishInnings2 = true, stopInn2At = Infinity } = {}) {
    console.log(`Match: ${TEAMS[a].name} vs ${TEAMS[b].name}`);
    const d = plus(dateOffset);
    const myMatches = await req("GET", `/match/${scorerId}`);
    const matchList = myMatches.json?.data || [];
    const existingMatch = matchList.find(
      (m) =>
        String(m.teamA_id) === String(teamIds[a]) &&
        String(m.teamB_id) === String(teamIds[b]) &&
        String(m.match_date).slice(0, 10) === iso(d) &&
        m.match_time === time
    );
    let matchId;
    if (existingMatch) {
      matchId = existingMatch._id; // resume: playInnings continues from live state
      console.log("  existing fixture — resuming:", matchId);
    }
    if (!matchId) {
      r = await req("POST", "/match", {
        tournament_id: tourId,
        tournament_name: "Urlabari Premier League 2026",
        teamA: TEAMS[a].name,
        teamB: TEAMS[b].name,
        teamA_id: teamIds[a],
        teamB_id: teamIds[b],
        match_date: iso(d),
        match_time: time,
        venue: "Urlabari Ground, Morang",
      });
      matchId = r.json?.data?._id || r.json?.match?._id || r.json?._id;
      if (!matchId) {
        const after = await req("GET", `/match/${scorerId}`);
        const found = (after.json?.data || []).find(
          (m) => String(m.teamA_id) === String(teamIds[a]) && String(m.teamB_id) === String(teamIds[b]) && m.match_time === time
        );
        matchId = found?._id;
      }
      if (!matchId) throw new Error(`Match create failed: ${JSON.stringify(r.json).slice(0, 200)}`);
    }

    const xiA = squads[teamIds[a]].slice(0, 11);
    const xiB = squads[teamIds[b]].slice(0, 11);
    const xiNamesA = squadNames[teamIds[a]].slice(0, 11).map((name, i) => ({ name, isCaptain: i === 0 }));
    const xiNamesB = squadNames[teamIds[b]].slice(0, 11).map((name, i) => ({ name, isCaptain: i === 0 }));
    r = await req("PUT", `/match/${matchId}/selectXI`, {
      tournament_id: tourId,
      playingXI: [
        { teamId: teamIds[a], teamName: TEAMS[a].name, players: xiNamesA },
        { teamId: teamIds[b], teamName: TEAMS[b].name, players: xiNamesB },
      ],
      toss: { wonBy: teamIds[a], decision: "bat" },
    });
    if (r.status >= 400) throw new Error(`selectXI failed: ${JSON.stringify(r.json).slice(0, 200)}`);

    const s1 = await playInnings(matchId, 1, xiA, xiB);
    console.log(`  inn1: ${s1.runs}/${s1.wickets} (${s1.oversText})`);
    if (finishInnings2 || stopInn2At !== Infinity) {
      const s2 = await playInnings(matchId, 2, xiB, xiA, stopInn2At);
      console.log(`  inn2: ${s2.runs}/${s2.wickets} (${s2.oversText}) complete=${s2.isComplete}`);
    }
    return matchId;
  }

  await playMatch(0, 0, 1, -1, "10:00");
  await playMatch(1, 2, 3, 0, "09:00");
  await playMatch(2, 0, 2, 0, "14:00", { finishInnings2: false, stopInn2At: 38 }); // live chase

  console.log("Upcoming match…");
  r = await req("POST", "/match", {
    tournament_id: tourId,
    tournament_name: "Urlabari Premier League 2026",
    teamA: TEAMS[1].name,
    teamB: TEAMS[3].name,
    teamA_id: teamIds[1],
    teamB_id: teamIds[3],
    match_date: iso(plus(1)),
    match_time: "11:00",
    venue: "Urlabari Ground, Morang",
  });
  console.log("  upcoming:", r.json?.data?._id || r.status);

  console.log("Verify…");
  const matches = await req("GET", "/view/matches");
  const table = await req("GET", `/view/tournaments/${tourId}/points-table`);
  const stats = await req("GET", `/view/tournaments/${tourId}/stats`);
  console.log("  matches:", (matches.json.data || []).map((m) => `${m.teamA} vs ${m.teamB} [${m.state}]`).join(" | "));
  console.log("  table rows:", (table.json.data || []).length, " top bat:", stats.json.data?.batting?.[0]?.name, stats.json.data?.batting?.[0]?.runs, "runs");
  console.log("DONE");
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message);
  process.exit(1);
});
