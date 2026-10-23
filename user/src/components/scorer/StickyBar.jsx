import { RotateCcw } from "lucide-react";

/** Sticky bottom bar: innings status + the undo action. */
function StickyBar({ inningNumber, view, battingTeamName, posting, canUndo, onUndo }) {
  return (
<div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
  <div className="max-w-2xl mx-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
    <div className="glass surface-card pointer-events-auto flex items-center gap-3 px-4 py-3 shadow-2xl">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
          Innings {inningNumber}
          {view?.freeHit ? " · Free hit" : ""}
          {view?.isComplete ? " · Complete" : ""}
        </p>
        <p className="font-space font-bold text-heading tabular-nums truncate">
          {battingTeamName} {view?.runs}/{view?.wickets}
          <span className="text-subheading text-sm font-semibold">
            {" "}
            ({view?.oversText} ov)
          </span>
        </p>
      </div>
      {posting && (
        <span className="text-xs font-semibold text-subheading animate-pulse shrink-0">
          Saving…
        </span>
      )}
      <button
        type="button"
        disabled={posting || !canUndo}
        onClick={onUndo}
        className="min-h-11 px-4 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-sm flex items-center gap-2 cursor-pointer shadow active:scale-95 transition-transform duration-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0"
      >
        <RotateCcw size={17} /> UNDO
      </button>
    </div>
  </div>
</div>
  );
}

export default StickyBar;
