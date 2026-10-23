const RUN_BUTTONS = [0, 1, 2, 3, 4, 6];

const padBtn =
  "min-h-14 rounded-2xl border font-space font-bold text-xl flex items-center justify-center cursor-pointer shadow-sm select-none active:scale-95 transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

/**
 * The scoring keypad: run buttons, extras sheets and the wicket
 * button. Pure presentation — taps are reported via onRun / onOpenSheet.
 */
function BallPad({ disabled, posting, onRun, onOpenSheet }) {
  return (
<div className="mt-4" aria-busy={posting}>
  <div className="grid grid-cols-6 gap-2">
    {RUN_BUTTONS.map((n) => (
      <button
        key={n}
        type="button"
        disabled={disabled}
        onClick={() => onRun(n)}
        className={`${padBtn} ${
          n === 4
            ? "bg-emerald-600 text-white border-emerald-600"
            : n === 6
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600/70 text-heading"
        }`}
      >
        {n}
      </button>
    ))}
  </div>
  <div className="grid grid-cols-4 gap-2 mt-2">
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpenSheet("wide")}
      className={`${padBtn} bg-amber-500 text-white border-amber-500 text-base`}
    >
      WD
    </button>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpenSheet("noball")}
      className={`${padBtn} bg-amber-600 text-white border-amber-600 text-base`}
    >
      NB
    </button>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpenSheet("bye")}
      className={`${padBtn} bg-sky-600 text-white border-sky-600 text-base`}
    >
      BYE
    </button>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpenSheet("legbye")}
      className={`${padBtn} bg-sky-500 text-white border-sky-500 text-base`}
    >
      LB
    </button>
  </div>
  <div className="mt-2">
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpenSheet("wicket")}
      className={`${padBtn} w-full bg-red-600 text-white border-red-600 tracking-wide`}
    >
      WICKET
    </button>
  </div>
  {posting && (
    <p className="text-center text-sm text-subheading mt-2 animate-pulse">
      Saving ball…
    </p>
  )}
</div>
  );
}

export default BallPad;
