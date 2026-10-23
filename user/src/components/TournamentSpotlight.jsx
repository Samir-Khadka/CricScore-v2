import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarRange, MapPin, Trophy } from "lucide-react";
import TeamChip from "./TeamChip";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

const nrrText = (nrr) =>
  typeof nrr === "number"
    ? nrr > 0
      ? `+${nrr.toFixed(3)}`
      : nrr.toFixed(3)
    : "—";

function MiniStandings({ rows }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-secondary">
        Standings
      </p>
      <div className="mt-2.5 divide-y divide-[var(--color-card-border)]">
        {rows.slice(0, 4).map((r, i) => (
          <div key={r.teamId || r.team || i} className="flex items-center gap-2.5 py-2">
            <span className="font-space text-[13px] font-bold text-secondary w-4 tabular-nums">
              {i + 1}
            </span>
            <TeamChip name={r.team} size="sm" />
            <span className="flex-1 min-w-0 truncate text-[14px] font-semibold text-heading">
              {r.team}
            </span>
            <span className="tabular-nums text-[12px] text-subheading font-space">
              {r.played}P
            </span>
            <span className="tabular-nums text-[13px] font-bold text-heading font-space w-8 text-right">
              {r.points} pts
            </span>
            <span className="tabular-nums text-[12px] text-subheading font-space w-14 text-right">
              {nrrText(r.nrr)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniLeaders({ title, rows, accent, badge, valueKey, suffix }) {
  const textCls =
    accent === "orange"
      ? "text-orange-600 dark:text-orange-400"
      : "text-violet-600 dark:text-violet-400";
  const badgeCls = accent === "orange" ? "bg-orange-500" : "bg-violet-600";
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-secondary">
        {title}
      </p>
      <div className="mt-2.5 divide-y divide-[var(--color-card-border)]">
        {rows.slice(0, 3).map((r, i) => (
          <div key={r.playerId || r.name || i} className="flex items-center gap-2.5 py-2">
            <span className="font-space text-[13px] font-bold text-secondary w-4 tabular-nums">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[14px] font-semibold text-heading leading-tight">
                {r.name}
                {i === 0 && (
                  <span
                    className={`ml-2 align-middle text-[9px] font-black uppercase tracking-wider text-white rounded-full px-1.5 py-0.5 ${badgeCls}`}
                  >
                    {badge}
                  </span>
                )}
              </p>
              <p className="truncate text-[11.5px] text-secondary leading-tight mt-0.5">
                {r.team}
              </p>
            </div>
            <span
              className={`font-condensed font-bold text-[22px] leading-none tabular-nums ${
                i === 0 ? textCls : "text-heading"
              }`}
            >
              {r[valueKey]}
              <span className="text-[11px] font-space font-semibold text-secondary ml-1">
                {suffix}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Homepage spotlight for the headline tournament: gradient banner with
 * meta, a top-4 standings preview and the cap-race mini leaderboards.
 * Props: { tournament, allTournaments, points, stats, loading }
 */
const TournamentSpotlight = ({
  tournament,
  allTournaments,
  points,
  stats,
  loading,
}) => {
  const navigate = useNavigate();
  if (!tournament) return null;

  const t = tournament;
  const go = () =>
    navigate(`/tournament/${encodeURIComponent(t.tournament_name)}`, {
      state: { tourInfo: allTournaments || [t] },
    });

  const hasPoints = Array.isArray(points) && points.length > 0;
  const batting = stats?.batting || [];
  const bowling = stats?.bowling || [];
  const hasStats = batting.length > 0 || bowling.length > 0;

  return (
    <div className="surface-card overflow-hidden">
      {/* banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-zinc-900 px-5 sm:px-7 py-6">
        <svg
          aria-hidden="true"
          className="absolute -right-10 -top-16 h-56 w-56 text-emerald-400/15"
          viewBox="0 0 48 48"
          fill="none"
        >
          <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M16.8 4.2c-4.6 6-4.6 13.6 0 19.8 4.6 6.2 4.6 13.8 0 19.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="3.4 2.9"
          />
          <path
            d="M31.2 4.2c4.6 6 4.6 13.6 0 19.8-4.6 6.2-4.6 13.8 0 19.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="3.4 2.9"
          />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
              <Trophy size={14} />
              Tournament Spotlight
            </p>
            <p className="mt-2 font-condensed font-bold uppercase tracking-wide text-white text-4xl sm:text-5xl leading-none truncate">
              {t.tournament_name}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] font-medium text-emerald-100/80">
              {t.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {t.venue}
                </span>
              )}
              {(t.start_date || t.end_date) && (
                <span className="flex items-center gap-1.5">
                  <CalendarRange size={14} />
                  {fmtDate(t.start_date)}
                  {t.end_date ? ` — ${fmtDate(t.end_date)}` : ""}
                </span>
              )}
            </div>
            {t.description && (
              <p className="mt-2 text-[13.5px] text-emerald-100/70 max-w-xl line-clamp-2">
                {t.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={go}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-emerald-950 text-sm font-bold shadow-lg hover:-translate-y-px transition-[transform,box-shadow] cursor-pointer shrink-0"
          >
            Tournament hub
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* body */}
      <div className="px-5 sm:px-7 py-5">
        {loading && !hasPoints && !hasStats ? (
          <div className="animate-pulse space-y-3" aria-hidden="true">
            <div className="h-4 w-1/3 rounded bg-secondary" />
            <div className="h-4 w-2/3 rounded bg-secondary" />
            <div className="h-4 w-1/2 rounded bg-secondary" />
          </div>
        ) : hasPoints || hasStats ? (
          <div className="grid md:grid-cols-3 gap-x-8 gap-y-6">
            {hasPoints && <MiniStandings rows={points} />}
            {batting.length > 0 && (
              <MiniLeaders
                title="Most Runs"
                rows={batting}
                accent="orange"
                badge="Orange Cap"
                valueKey="runs"
                suffix="runs"
              />
            )}
            {bowling.length > 0 && (
              <MiniLeaders
                title="Most Wickets"
                rows={bowling}
                accent="violet"
                badge="Purple Cap"
                valueKey="wickets"
                suffix="wkts"
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-subheading">
            Standings, cap races and player stats light up here as soon as
            the first match is scored.
          </p>
        )}
      </div>
    </div>
  );
};

export default memo(TournamentSpotlight);
