import { memo } from "react";
import { shadeHex, teamColorHex } from "../lib/cricket";

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
  const leaderHex = a >= b ? hexA : hexB;

  return (
    <div
      role="img"
      aria-label={`Win probability: ${teamA} ${a} percent, ${teamB} ${b} percent`}
    >
      <div className="flex items-end justify-between gap-3">
        <span className="flex items-center gap-2 min-w-0 text-heading">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white/25"
            style={{ backgroundColor: hexA }}
          />
          <span className="truncate text-[11px] font-bold uppercase tracking-wider">
            {teamA}
          </span>
          <span className="font-display font-black tabular-nums text-[22px] leading-none">
            {a}
            <span className="text-[13px] font-extrabold text-subheading">%</span>
          </span>
        </span>
        <span className="text-secondary text-[10px] font-black uppercase tracking-[0.18em] shrink-0 hidden sm:block pb-0.5">
          Win probability
        </span>
        <span className="flex items-center gap-2 min-w-0 text-heading">
          <span className="font-display font-black tabular-nums text-[22px] leading-none">
            {b}
            <span className="text-[13px] font-extrabold text-subheading">%</span>
          </span>
          <span className="truncate text-[11px] font-bold uppercase tracking-wider">
            {teamB}
          </span>
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white/25"
            style={{ backgroundColor: hexB }}
          />
        </span>
      </div>
      <div
        className="relative mt-2 flex h-3.5 w-full overflow-hidden rounded-full bg-secondary/50 ring-1 ring-black/5 dark:ring-white/10"
        style={{ boxShadow: `0 6px 18px -8px ${leaderHex}80` }}
      >
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{
            width: `${a}%`,
            backgroundImage: `linear-gradient(90deg, ${shadeHex(hexA, -14)}, ${hexA} 60%, ${shadeHex(hexA, 14)})`,
          }}
        />
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{
            width: `${b}%`,
            backgroundImage: `linear-gradient(90deg, ${shadeHex(hexB, 14)}, ${hexB} 40%, ${shadeHex(hexB, -14)})`,
          }}
        />
        {/* centre notch */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/50 dark:bg-black/40"
        />
      </div>
    </div>
  );
};

export default memo(WinMeter);
