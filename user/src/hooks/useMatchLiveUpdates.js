import { useCallback, useEffect, useRef, useState } from "react";
import { matchSocket } from "../lib/api";

/**
 * Live-update plumbing for the match page.
 *
 * The socket tells us a ball landed, but its payload is the raw innings
 * snapshots — not the engine-derived state, events and milestones the
 * page renders — so the detail is still refetched over HTTP. The
 * coalescing policy lives here, in one named place:
 *
 *  - a burst of balls collapses into ONE refetch (350 ms trailing
 *    window), and
 *  - a refetch already in flight is followed by at most one more.
 *
 * The page hands in its raw fetcher `(signal, silent) => Promise` and
 * gets back a guarded `fetchDetail` with the same signature (a silent
 * call is dropped while another fetch is in flight; loud calls always
 * run) plus the socket's `connected` flag for the reconnecting hint.
 */
export function useMatchLiveUpdates(matchId, rawFetch) {
  const [connected, setConnected] = useState(false);
  const fetchingRef = useRef(false);
  const timerRef = useRef(null);

  const fetchDetail = useCallback(
    async (signal, silent = false) => {
      if (fetchingRef.current && silent) return;
      fetchingRef.current = true;
      try {
        await rawFetch(signal, silent);
      } finally {
        fetchingRef.current = false;
      }
    },
    [rawFetch]
  );

  useEffect(() => {
    const socket = matchSocket(matchId);
    const scheduleRefetch = () => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (fetchingRef.current) {
          scheduleRefetch();
          return;
        }
        fetchDetail(undefined, true);
      }, 350);
    };
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("matchLiveUpdate", scheduleRefetch);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      socket.off("matchLiveUpdate");
      socket.disconnect();
    };
  }, [matchId, fetchDetail]);

  return { fetchDetail, connected };
}
