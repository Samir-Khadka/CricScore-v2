import { Link } from "react-router-dom";
import { findInnings, teamInitials } from "../lib/cricket";
import LiveDot from "./LiveDot";

/**
 * Broadcast ticker: one chip per live match, horizontally scrollable.
 * Renders nothing when there are no live matches.
 * Props: { matches } — the /view/matches?state=live list payload.
 */
function chipScore(match) {
  const a = findInnings(match, match?.teamA_id);
  const b = findInnings(match, match?.teamB_id);
  const fmt = (inn) =>
    inn ? `${inn.runs}/${inn.wickets}` : null;
  const current =
    match?.inning_in_progress === 2 ? b || a : a || b;
  const overs = current
    ? `${current.over}.${current.balls}`
    : null;
  return { a: fmt(a), b: fmt(b), overs };
}

const LiveTicker = ({ matches }) => {
  const live = (matches || []).filter((m) => m && m._id);
  if (live.length === 0) return null;

  return (
    <div className="w-full border-b card-border bg-card/70">
      <div className="max-w-[1440px] mx-auto flex items-stretch">
        <div className="hidden sm:flex items-center pl-4 md:pl-10 pr-3 py-2 shrink-0 border-r card-border">
          <span className="live-badge">
            <LiveDot />
            IN PLAY
          </span>
        </div>
        <div className="ticker-mask overflow-x-auto no-scrollbar flex-1">
          <div className="flex items-center gap-2 px-3 py-2 w-max">
            {live.map((m) => {
              const s = chipScore(m);
              return (
                <Link
                  key={m._id}
                  to={`/match/${m._id}`}
                  className="flex items-center gap-2.5 rounded-full bg-card/80 hover:bg-secondary ring-1 ring-black/5 dark:ring-white/10 shadow-sm pl-2 pr-3.5 py-2 transition-colors whitespace-nowrap"
                >
                  <LiveDot />
                  <span className="font-condensed font-semibold text-[15px] tracking-wide text-heading">
                    {teamInitials(m.teamA)}
                    {s.a && (
                      <span className="tabular-nums text-subheading font-space text-[13px] ml-1.5">
                        {s.a}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-black tracking-widest text-secondary">
                    VS
                  </span>
                  <span className="font-condensed font-semibold text-[15px] tracking-wide text-heading">
                    {teamInitials(m.teamB)}
                    {s.b && (
                      <span className="tabular-nums text-subheading font-space text-[13px] ml-1.5">
                        {s.b}
                      </span>
                    )}
                  </span>
                  {s.overs && (
                    <span className="tabular-nums text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {s.overs} ov
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTicker;
