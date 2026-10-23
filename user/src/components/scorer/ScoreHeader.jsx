import TimelineItem from "../TimelineItem";
import { fmt2 } from "../../lib/cricket";

/**
 * Console score header: batting side, score, CRR / RRR / projected and
 * the this-over strip. Pure presentation — all state lives in the
 * ScorerConsole page.
 */
function ScoreHeader({
  battingTeamName,
  fieldingTeamName,
  format,
  view,
  inningNumber,
  runsNeeded,
  ballsRemaining,
}) {
  return (
<div className="mt-4 surface-card p-4">
  <div className="flex items-start justify-between gap-2">
    <div>
      <p className="font-bold text-heading text-lg leading-tight">
        {battingTeamName}
      </p>
      <p className="text-xs text-subheading">
        vs {fieldingTeamName} · {format} overs
      </p>
    </div>
    {view?.freeHit && (
      <span className="bg-amber-500 text-black text-xs font-black px-2.5 py-1 rounded-full animate-pulse">
        FREE HIT
      </span>
    )}
  </div>
  <div className="flex items-end justify-between mt-2 flex-wrap gap-2">
    <p className="font-display font-black text-[38px] leading-none text-heading tabular-nums">
      {view?.runs}/{view?.wickets}
      <span className="text-lg text-subheading font-bold ml-2 font-inter">
        ({view?.oversText} ov)
      </span>
    </p>
    <div className="text-right text-sm font-semibold text-subheading tabular-nums">
      <p>
        CRR{" "}
        <span className="font-space text-heading">
          {fmt2(view?.crr)}
        </span>
      </p>
      {inningNumber === 2 && view?.target ? (
        <p>
          Need{" "}
          <span className="font-space text-heading">
            {runsNeeded}
          </span>{" "}
          off{" "}
          <span className="font-space text-heading">
            {ballsRemaining}
          </span>{" "}
          · RRR{" "}
          <span className="font-space text-heading">
            {fmt2(view?.rrr)}
          </span>
        </p>
      ) : (
        <p>
          Projected{" "}
          <span className="font-space text-heading">
            {view?.projectedScore ??
              Math.round((view?.crr || 0) * format)}
          </span>
        </p>
      )}
    </div>
  </div>
  {view?.thisOver?.length > 0 && (
    <div className="flex items-center flex-wrap mt-3">
      <span className="text-xs font-bold text-secondary mr-1">
        This over:
      </span>
      {view.thisOver.map((s, i) => (
        <TimelineItem key={i} result={s} />
      ))}
    </div>
  )}
</div>
  );
}

export default ScoreHeader;
