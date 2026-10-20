/**
 * Organizer-flow helpers: squads, match state checks and id resolution
 * for the tournament → teams → squads → match → XI journey.
 */
import { api } from "./api";

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
 * GET /players/:tourId/:teamId → { players: [ { players: [{_id, name}] } ] }
 * Returns { exists, names } — `exists` tells POST (create) from PUT
 * (replace) apart when saving.
 */
export async function fetchSquad(tourId, teamId) {
  try {
    const res = await api.get(`/players/${tourId}/${teamId}`);
    const docs = res?.players ?? res?.data?.players ?? null;
    if (Array.isArray(docs) && docs.length > 0) {
      const players = Array.isArray(docs[0]?.players) ? docs[0].players : [];
      return {
        exists: true,
        names: players
          .map((p) => (typeof p === "string" ? p : p?.name))
          .filter(Boolean),
      };
    }
    return { exists: false, names: [] };
  } catch {
    return { exists: false, names: [] };
  }
}

/**
 * Save a squad. POST creates; PUT replaces an existing squad. If POST
 * still reports the squad exists (race / shape surprise), fall back to
 * the PUT replace so the organizer is never stuck.
 */
export async function saveSquad(tourId, teamId, names, exists) {
  const players = names.map((name) => ({ name }));
  if (exists) {
    await api.put("/players/update", { tourId, teamId, players });
    return;
  }
  try {
    await api.post("/players", { tourId, teamId, players });
  } catch (err) {
    if (/already/i.test(err?.message || "")) {
      await api.put("/players/update", { tourId, teamId, players });
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
