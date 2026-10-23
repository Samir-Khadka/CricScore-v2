import { memo } from "react";
import { ballChipClass } from "../lib/cricket";

/**
 * One commentary row.
 * Props: { label ("4.2"), text, symbol (ball chip, e.g. "4", "W", "1") }
 */
const Commentary = ({ label, text, symbol }) => {
  return (
    <div className="w-full bg-card ring-1 ring-black/5 dark:ring-white/10 rounded-xl px-3.5 py-3 mb-2.5 shadow-sm">
      <div className="flex flex-row items-start gap-3">
        <p className="bg-secondary text-subheading text-center px-2.5 py-1 rounded-lg font-space text-xs font-bold tabular-nums shrink-0 min-w-12 mt-0.5">
          {label}
        </p>
        <p className="py-0.5 text-heading flex-1 text-[15px] leading-snug">
          {text}
        </p>
        {symbol !== undefined && symbol !== null && symbol !== "" && (
          <p
            className={`h-8 min-w-8 px-1.5 rounded-full font-space text-xs font-bold inline-flex items-center justify-center shrink-0 border shadow-sm ${ballChipClass(
              symbol
            )}`}
          >
            {symbol}
          </p>
        )}
      </div>
    </div>
  );
};

export default memo(Commentary);
