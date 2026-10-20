/**
 * Organizer-flow helpers: squads, match state checks and id resolution
 * for the tournament → teams → squads → match → XI journey.
 */
import { api } from "./api";

/** The four squad roles, in display order. */
export const ROLES = ["Batsman", "Bowler", "All-Rounder", "Wicket-Keeper"];

/** Role used when a player has none saved yet / for pasted names. */
export const DEFAULT_ROLE = "Batsman";

/** Visual language per role: short label + pill / chip classes. */
export const ROLE_META = {
  Batsman: {
    short: "BAT",
    pill:
      "border-sky-500/50 bg-sky-500/15 text-sky-600 dark:text-sky-400",
    chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  Bowler: {
    short: "BOWL",
    pill:
      "border-rose-500/50 bg-rose-500/15 text-rose-600 dark:text-rose-400",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  "All-Rounder": {
    short: "AR",
    pill:
      "border-violet-500/50 bg-violet-500/15 text-violet-600 dark:text-violet-400",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  "Wicket-Keeper": {
    short: "WK",
    pill:
      "border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
};

/** Coerce any stored value into a valid role. */
export function normalizeRole(role) {
  return ROLES.includes(role) ? role : DEFAULT_ROLE;
}

/** Tournament id of a match doc (tournament_id may be id or populated). */
export function matchTournamentId(m) {
  const t = m?.tournament_id;
  if (t == null) return null;
  if (typeof t === "object") return t._id ? String(t._id) : null;
  return String(t);
}

/**
 * True when the match already has a usable Playing XI (selectXI done).
 * selectXI flips matchState to "live"; a completed match also implies
 * XIs were set. Otherwise inspect the stored playingXI directly.
 */
export function matchHasXI(m) {
  const s = String(m?.matchState || "").toLowerCase();
  if (s === "live" || s === "completed") return true;
  const xi = m?.playingXI;
  return (
    Array.isArray(xi) &&
    xi.length === 2 &&
    xi.every((t) => Array.isArray(t?.players) && t.players.length === 11)
  );
}

/**
 * Fetch one team's squad.
 * GET /players/:tourId/:teamId →
 *   { players: [ { players: [{_id, name, role, isCaptain}] } ] }
 * Returns { exists, names, players } — `exists` tells POST (create)
 * from PUT (replace) apart when saving; `players` carries the saved
 * role / captain flag per player for the squad sheet.
 */
export async function fetchSquad(tourId, teamId) {
  try {
    const res = await api.get(`/players/${tourId}/${teamId}`);
    const docs = res?.players ?? res?.data?.players ?? null;
    if (Array.isArray(docs) && docs.length > 0) {
      const raw = Array.isArray(docs[0]?.players) ? docs[0].players : [];
      const players = raw
        .map((p) =>
          typeof p === "string"
            ? { name: p, role: DEFAULT_ROLE, isCaptain: false }
            : {
                name: p?.name,
                role: normalizeRole(p?.role),
                isCaptain: !!p?.isCaptain,
              }
        )
        .filter((p) => p.name);
      return { exists: true, names: players.map((p) => p.name), players };
    }
    return { exists: false, names: [], players: [] };
  } catch {
    return { exists: false, names: [], players: [] };
  }
}

/**
 * Save a squad. `players` is a list of { name, role, isCaptain }.
 * POST creates; PUT replaces an existing squad. If POST still reports
 * the squad exists (race / shape surprise), fall back to the PUT
 * replace so the organizer is never stuck.
 */
export async function saveSquad(tourId, teamId, players, exists) {
  const body = {
    tourId,
    teamId,
    players: players.map((p) => ({
      name: p.name,
      role: normalizeRole(p.role),
      isCaptain: !!p.isCaptain,
    })),
  };
  if (exists) {
    await api.put("/players/update", body);
    return;
  }
  try {
    await api.post("/players", body);
  } catch (err) {
    if (/already/i.test(err?.message || "")) {
      await api.put("/players/update", body);
      return;
    }
    throw err;
  }
}

/** Parse a one-name-per-line textarea into a clean list of names. */
export function parseNames(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** Parse a pasted list — names separated by newlines and/or commas. */
export function parsePastedNames(text) {
  return String(text || "")
    .split(/[\r\n,]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** Case-insensitive duplicate names in a list (for flagging). */
export function duplicateNames(names) {
  const seen = new Map();
  const dupes = [];
  for (const n of names) {
    const key = n.toLowerCase();
    if (seen.has(key) && !dupes.includes(seen.get(key))) dupes.push(seen.get(key));
    if (!seen.has(key)) seen.set(key, n);
  }
  return dupes;
}
