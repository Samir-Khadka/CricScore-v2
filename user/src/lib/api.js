import { io } from "socket.io-client";

/**
 * Central API layer for the CricScore backend.
 *
 * The base URL comes from VITE_API_URL (see .env.example) and every path is
 * resolved under `${API_BASE}/api/cricscore`. Auth is cookie-based
 * (httpOnly), so all requests send credentials.
 */
export const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_ROOT = `${API_BASE}/api/cricscore`;

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request(method, path, { body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_ROOT}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
      null
    );
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data?.message || `Request failed (${res.status})`,
      res.status,
      data
    );
  }
  return data;
}

export const api = {
  get: (path, opts) => request("GET", path, opts),
  post: (path, body, opts) => request("POST", path, { ...opts, body }),
  put: (path, body, opts) => request("PUT", path, { ...opts, body }),
  patch: (path, body, opts) => request("PATCH", path, { ...opts, body }),
  del: (path, body, opts) => request("DELETE", path, { ...opts, body }),
};

/** Many endpoints wrap payloads in { data }; some don't. Normalise here. */
export function unwrap(res, key) {
  if (res == null) return res;
  if (key && res[key] !== undefined) return res[key];
  if (res.data !== undefined) return res.data;
  return res;
}

/** Socket for the home page live-match list. */
export function homeSocket() {
  return io(API_BASE, {
    query: { module: "home" },
    autoConnect: true,
    reconnection: true,
  });
}

/** Socket joined to a single match room. */
export function matchSocket(matchId) {
  return io(API_BASE, {
    query: { module: "match", matchId },
    autoConnect: true,
    reconnection: true,
  });
}

/* ------------------------------------------------------------------ */
/* Scorer identity (the httpOnly cookie does the real auth; the id is  */
/* kept locally so the scorer area knows whose matches to list).       */
/* ------------------------------------------------------------------ */
const SCORER_KEY = "cricscore:scorerId";
const SCORER_NAME_KEY = "cricscore:scorerName";

export function getScorerId() {
  try {
    return localStorage.getItem(SCORER_KEY);
  } catch {
    return null;
  }
}

export function setScorer(id, name) {
  try {
    if (id) localStorage.setItem(SCORER_KEY, id);
    if (name) localStorage.setItem(SCORER_NAME_KEY, name);
  } catch {
    /* storage unavailable */
  }
}

export function clearScorer() {
  try {
    localStorage.removeItem(SCORER_KEY);
    localStorage.removeItem(SCORER_NAME_KEY);
  } catch {
    /* storage unavailable */
  }
}
