/**
 * Intent preloading for match navigation.
 *
 * Every match card links to /match/:id, whose page needs the lazy
 * Match chunk plus the match-detail GET. Warming both on the first
 * sign of intent (hover, keyboard focus, touch start) makes the tap
 * feel instant; if the user never follows through, the cost is one
 * cached GET with a 15 s TTL (see prefetchGet in lib/api).
 */
import { prefetchGet } from "./api";

export function prefetchMatch(matchId) {
  if (!matchId) return;
  import("../pages/Match.jsx").catch(() => {});
  prefetchGet(`/view/matches/${matchId}`);
}

/** Props to spread onto a match card's <Link>. */
export function matchPrefetchProps(matchId) {
  const warm = () => prefetchMatch(matchId);
  return { onMouseEnter: warm, onFocus: warm, onTouchStart: warm };
}
