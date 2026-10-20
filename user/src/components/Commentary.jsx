import { ballChipClass } from "../lib/cricket";

/**
 * One commentary row.
 * Props: { label ("4.2"), text, symbol (ball chip, e.g. "4", "W", "1") }
 */
const Commentary = ({ label, text, symbol }) => {
  return (
    <div className="w-full bg-card p-3 border-2 rounded-lg card-border mb-4">
      <div className="flex flex-row items-start gap-3">
        <p className="bg-green-500/40 text-center px-3 py-1 rounded-lg font-space font-semibold text-heading shrink-0 min-w-14">
          {label}
        </p>
        <p className="px-1 py-1 text-heading flex-1">{text}</p>
        {symbol !== undefined && symbol !== null && symbol !== "" && (
          <p
            className={`px-3 py-1 rounded-lg font-space font-semibold text-center shrink-0 border ${ballChipClass(
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

export default Commentary;
