/**
 * Cricket display helpers shared by the viewer pages and the scorer console.
 *
 * The backend exposes two shapes for an innings:
 *  - the engine `state` (camelCase, derived live from the ball log), and
 *  - the stored innings document snapshot (snake_case).
 * `inningsView` normalises either/both into one view model so components
 * never derefence raw shapes.
 */

export const fmt2 = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "0.00"
    : Number(n).toFixed(2);

export function oversTextFromBalls(legalBalls = 0) {
  const b = Math.max(0, Number(legalBalls) || 0);
  return `${Math.floor(b / 6)}.${b % 6}`;
}

export function isBattingStatus(status) {
  return status === "batting" || status === "notOut" || status === "not out";
}

/** Find the innings doc in which `teamId` batted. Safe on missing data. */
export function findInnings(match, teamId) {
  if (!match || !Array.isArray(match.innings) || teamId == null) return null;
  return (
    match.innings.find(
      (inn) => inn && typeof inn === "object" && String(inn.batting_team) === String(teamId)
    ) || null
  );
}

/** Total overs for a match (format may be a populated object or missing). */
export function matchFormat(match) {
  const t = match?.tournament_id;
  if (t && typeof t === "object" && t.format) return Number(t.format);
  return null;
}

/**
 * Normalise an innings into a single view model.
 * @param {object|null} inning stored innings document (snake_case) or null
 * @param {object|null} state  engine state (camelCase) or null
 */
export function inningsView(inning, state) {
  if (!inning && !state) return null;

  const runs = state?.runs ?? inning?.runs ?? 0;
  const wickets = state?.wickets ?? inning?.wickets ?? 0;
  const legalBalls =
    state?.legalBalls ?? inning?.legal_balls ?? (inning ? inning.over * 6 + inning.balls : 0);
  const oversText = state?.oversText ?? oversTextFromBalls(legalBalls);
  const target = inning?.target || state?.target || null;

  const extras = state?.extras
    ? {
        wide: state.extras.wide || 0,
        noBall: state.extras.noBall || 0,
        bye: state.extras.bye || 0,
        legBye: state.extras.legBye || 0,
        penalty: state.extras.penalty || 0,
        total: state.extras.total ?? 0,
      }
    : {
        wide: inning?.extras?.wide || 0,
        noBall: inning?.extras?.no_ball || 0,
        bye: inning?.extras?.bye || 0,
        legBye: inning?.extras?.leg_bye || 0,
        penalty: inning?.extras?.penalty || 0,
        total: 0,
      };
  if (!state?.extras) {
    extras.total =
      extras.wide + extras.noBall + extras.bye + extras.legBye + extras.penalty;
  }

  const batsmen = state?.batsmen
    ? state.batsmen.map((b) => ({
        id: b.id,
        name: b.name,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        sr: b.strikeRate,
        status: b.status,
        howOut: b.howOut || "",
        batting: isBattingStatus(b.status),
      }))
    : (inning?.batsmen || []).map((b) => ({
        id: b.batsmanId,
        name: b.name,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        sr: b.strike_rate,
        status: b.status,
        howOut: b.how_out || "",
        batting: isBattingStatus(b.status),
      }));

  const bowlers = state?.bowlers
    ? state.bowlers.map((b) => ({
        id: b.id,
        name: b.name,
        balls: b.balls,
        oversText: b.oversText || oversTextFromBalls(b.balls),
        maidens: b.maidens,
        runsConceded: b.runsConceded,
        wickets: b.wickets,
        economy: b.economy,
        wide: b.extras?.wide || 0,
        noBall: b.extras?.noBall || 0,
      }))
    : (inning?.bowlers || []).map((b) => ({
        id: b.bowlerId,
        name: b.name,
        balls: b.balls,
        oversText: oversTextFromBalls(b.balls),
        maidens: b.maidens,
        runsConceded: b.runs_conceded,
        wickets: b.wickets,
        economy: b.economy,
        wide: b.extras?.wide || 0,
        noBall: b.extras?.no_ball || 0,
      }));

  const fallOfWickets = state?.fallOfWickets
    ? state.fallOfWickets
    : (inning?.fall_of_wickets || []).map((f) => ({
        wicket: f.wicket,
        runs: f.runs,
        playerOutName: f.playerOutName,
        oversText: f.oversText,
      }));

  const overs = state?.overs?.length
    ? state.overs
    : (inning?.per_over || []).map((o) => ({
        over: o.over,
        runs: o.runs,
        wickets: o.wickets,
      }));

  return {
    runs,
    wickets,
    legalBalls,
    oversText,
    target,
    crr: state?.currentRunRate ?? inning?.current_run_rate ?? 0,
    rrr: state?.requiredRunRate ?? inning?.required_run_rate ?? null,
    runsNeeded: state?.runsNeeded ?? (target ? target - runs : null),
    ballsRemaining: state?.ballsRemaining ?? null,
    projectedScore: state?.projectedScore ?? null,
    extras,
    batsmen,
    bowlers,
    fallOfWickets,
    overs,
    thisOver: state?.thisOver ?? inning?.this_over ?? [],
    freeHit: state?.freeHit ?? inning?.free_hit ?? false,
    isComplete: state?.isComplete ?? inning?.status === "completed",
    strikerId: state?.striker ?? inning?.striker ?? null,
    nonStrikerId: state?.nonStriker ?? inning?.non_striker ?? null,
    currentBowlerId: state?.currentBowler ?? inning?.current_bowler ?? null,
    currentPair: state?.currentPair ?? null,
    winProbability: state?.winProbability ?? null,
    partnerships: state?.partnerships ?? [],
    status: inning?.status || null,
    inningNumber: inning?.inningNumber ?? null,
    battingTeam: inning?.batting_team ?? null,
    fieldingTeam: inning?.fielding_team ?? null,
  };
}

/**
 * Compute an "over.ball" label for every event in an innings log.
 * Extras (wides / no-balls) share the label of the legal ball they precede.
 */
export function ballLabels(events = []) {
  let legal = 0;
  return events.map((ev) => {
    const label = `${Math.floor(legal / 6)}.${(legal % 6) + 1}`;
    const ex = ev?.extras || {};
    if (!ex.wide && !ex.noBall) legal += 1;
    return label;
  });
}

/** Short result text for a ball event when no commentary text is stored. */
export function eventSummary(ev) {
  if (!ev) return "";
  const ex = ev.extras || {};
  const bat = ev.batRuns || 0;
  const parts = [];
  if (ev.wicket?.type) {
    parts.push(
      ev.wicket.type === "retired_hurt" ? "retired hurt" : "WICKET"
    );
  }
  if (ex.wide) parts.push(ex.wide > 1 ? `${ex.wide} wides` : "wide");
  if (ex.noBall) parts.push("no ball");
  if (ex.bye) parts.push(`${ex.bye} bye${ex.bye > 1 ? "s" : ""}`);
  if (ex.legBye) parts.push(`${ex.legBye} leg bye${ex.legBye > 1 ? "s" : ""}`);
  if (ex.penalty) parts.push(`${ex.penalty} penalty runs`);
  if (bat > 0) parts.push(bat === 4 ? "FOUR" : bat === 6 ? "SIX" : `${bat} run${bat > 1 ? "s" : ""}`);
  if (parts.length === 0) return "no run";
  return parts.join(", ");
}

/** Commentary line for an event: stored text first, generated fallback. */
export function eventCommentary(ev) {
  if (ev?.commentary && String(ev.commentary).trim()) return ev.commentary;
  const bowler = ev?.names?.bowler || "Bowler";
  const batsman = ev?.names?.striker || "Batsman";
  return `${bowler} to ${batsman}, ${eventSummary(ev)}`;
}

/** Tailwind classes for a ball symbol chip (this-over strip / timeline). */
export function ballChipClass(symbol) {
  const s = String(symbol ?? "").trim();
  if (s === "W" || s.endsWith("W")) return "bg-rose-600 text-white border-rose-600";
  if (s === "6") return "bg-violet-600 text-white border-violet-600";
  if (s === "4") return "bg-emerald-600 text-white border-emerald-600";
  if (/wd/i.test(s)) return "bg-amber-500 text-white border-amber-500";
  if (/nb/i.test(s)) return "bg-amber-600 text-white border-amber-600";
  if (s === "•" || s === "0") return "bg-secondary text-subheading border-secondary";
  return "bg-card text-heading border-secondary";
}

/* ------------------------- team monograms -------------------------- */

/** Solid chip colours for team monograms (deterministic per team name). */
const TEAM_COLORS = [
  "bg-emerald-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-amber-500",
  "bg-violet-600",
  "bg-cyan-600",
  "bg-lime-600",
  "bg-fuchsia-600",
  "bg-indigo-600",
  "bg-orange-600",
  "bg-teal-600",
  "bg-blue-700",
];

/** Up-to-two-letter monogram for a team name ("Kathmandu Kings" → "KK"). */
export function teamInitials(name) {
  const words = String(name || "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function teamColorIndex(name) {
  const s = String(name || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash % TEAM_COLORS.length;
}

/** Deterministic monogram colour class for a team name. */
export function teamColorClass(name) {
  return TEAM_COLORS[teamColorIndex(name)];
}

/** Hex equivalents of TEAM_COLORS, same index — for SVG fills/strokes. */
const TEAM_COLOR_HEX = [
  "#059669", // emerald-600
  "#e11d48", // rose-600
  "#0284c7", // sky-600
  "#f59e0b", // amber-500
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#65a30d", // lime-600
  "#c026d3", // fuchsia-600
  "#4f46e5", // indigo-600
  "#ea580c", // orange-600
  "#0d9488", // teal-600
  "#1d4ed8", // blue-700
];

/** Deterministic team colour as a hex value (charts, meters). */
export function teamColorHex(name) {
  return TEAM_COLOR_HEX[teamColorIndex(name)];
}

/** Ball symbol for one event — mirrors the backend engine's ballSymbol(). */
export function ballSymbol(ev) {
  if (!ev) return "";
  const ex = ev.extras || {};
  const wide = ex.wide || 0;
  const noBall = ex.noBall || 0;
  const bye = ex.bye || 0;
  const legBye = ex.legBye || 0;
  const penalty = ex.penalty || 0;
  const bat = ev.batRuns || 0;
  const total = bat + wide + noBall + bye + legBye + penalty;
  if (ev.wicket?.type && ev.wicket.type !== "retired_hurt") {
    return total > 0 ? `${total}W` : "W";
  }
  if (wide > 0) return wide === 1 ? "Wd" : `${wide - 1}Wd`;
  if (noBall > 0) return bat > 0 ? `${bat}Nb` : "Nb";
  if (bye > 0) return `${bye}b`;
  if (legBye > 0) return `${legBye}lb`;
  if (bat === 0) return "•";
  return String(bat);
}

/** Extract a squad's player list from the /players endpoint response. */
export function squadPlayers(res) {
  if (!res) return [];
  const docs = Array.isArray(res) ? res : res.players || res.data?.players || res.data || [];
  const list = Array.isArray(docs) ? docs : [docs];
  for (const doc of list) {
    if (doc && Array.isArray(doc.players)) return doc.players;
  }
  return [];
}

export const WICKET_TYPES = [
  { value: "bowled", label: "Bowled" },
  { value: "caught", label: "Caught" },
  { value: "caught_and_bowled", label: "Caught & Bowled" },
  { value: "lbw", label: "LBW" },
  { value: "stumped", label: "Stumped" },
  { value: "hit_wicket", label: "Hit Wicket" },
  { value: "run_out", label: "Run Out" },
  { value: "retired_hurt", label: "Retired Hurt" },
  { value: "retired_out", label: "Retired Out" },
  { value: "obstructing", label: "Obstructing the Field" },
  { value: "hit_ball_twice", label: "Hit the Ball Twice" },
  { value: "timed_out", label: "Timed Out" },
];
