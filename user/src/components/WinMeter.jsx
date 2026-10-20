import { teamColorHex } from "../lib/cricket";

/**
 * Win-probability split bar. Team A is anchored to the left and team B to
 * the right (same orientation as the score header); `teamAPct` is team A's
 * share (0–100). Widths animate as the probability moves ball to ball.
 * Props: { teamA, teamB, teamAPct }
 */
const WinMeter = ({ teamA, teamB, teamAPct }) => {
  const a = Math.max(0, Math.min(100, Math.round(Number(teamAPct) || 0)));
  const b = 100 - a;
  const hexA = teamColorHex(teamA);
  const hexB = teamColorHex(teamB);

  return (
    <div
      role="img"
      aria-label={`Win probability: ${teamA} ${a} percent, ${teamB} ${b} percent`}
    >
      <div className="flex items-end justify-between gap-3 text-[11px] font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1.5 min-w-0 text-heading">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: hexA }}
          />
          <span className="truncate">{teamA}</span>
          <span className="font-space tabular-nums text-sm">{a}%</span>
        </span>
        <span className="text-secondary font-semibold normal-case tracking-normal shrink-0 hidden sm:block">
          Win probability
        </span>
        <span className="flex items-center gap-1.5 min-w-0 text-heading">
          <span className="font-space tabular-nums text-sm">{b}%</span>
          <span className="truncate">{teamB}</span>
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: hexB }}
          />
        </span>
      </div>
      <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary/50 ring-1 ring-black/5 dark:ring-white/10">
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{ width: `${a}%`, backgroundColor: hexA }}
        />
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{ width: `${b}%`, backgroundColor: hexB }}
        />
      </div>
    </div>
  );
};

export default WinMeter;
