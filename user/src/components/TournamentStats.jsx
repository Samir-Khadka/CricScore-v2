import { Spinner, ErrorBox, EmptyBox } from "./States";
import TeamChip from "./TeamChip";

/**
 * Tournament leaderboards.
 * Props: { batting, bowling, loading, error, onRetry }
 * batting: [{ name, team, innings, runs, balls, fours, sixes, fifties,
 *             hundreds, highest, average, strikeRate }] (most runs first)
 * bowling: [{ name, team, innings, wickets, balls, runsConceded, maidens,
 *             best, economy, average }] (most wickets first)
 */
const rate = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toFixed(2);

const CapBadge = ({ label, cls }) => (
  <span
    className={`ml-2 align-middle text-[10px] font-black uppercase tracking-wider text-white rounded-full px-2 py-0.5 ${cls}`}
  >
    {label}
  </span>
);

const Section = ({ title, badge, children }) => (
  <div className="surface-card overflow-hidden">
    <div className="px-5 py-4 border-b card-border flex items-center gap-2 flex-wrap">
      <p className="text-lg text-heading font-bold">{title}</p>
      {badge}
    </div>
    <div className="overflow-x-auto">{children}</div>
  </div>
);

const TournamentStats = ({ batting, bowling, loading, error, onRetry }) => {
  if (loading) return <Spinner label="Loading player stats…" />;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;

  const bat = batting || [];
  const bowl = bowling || [];
  if (bat.length === 0 && bowl.length === 0)
    return <EmptyBox message="No player stats available yet." />;

  return (
    <div className="flex flex-col gap-6">
      {bat.length > 0 && (
        <Section
          title="Most Runs"
          badge={
            <span className="text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white rounded-full px-2 py-0.5">
              Orange Cap Race
            </span>
          }
        >
          <table className="w-full min-w-[720px] text-left tabular-nums">
            <thead className="text-heading text-xs uppercase tracking-wider">
              <tr className="border-b-2 border-secondary">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Batter</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">Inn</th>
                <th className="px-4 py-3 text-center">Runs</th>
                <th className="px-4 py-3 text-center">HS</th>
                <th className="px-4 py-3 text-center">4s</th>
                <th className="px-4 py-3 text-center">6s</th>
                <th className="px-4 py-3 text-center">50s</th>
                <th className="px-4 py-3 text-center">100s</th>
                <th className="px-4 py-3 text-center">Avg</th>
                <th className="px-4 py-3 text-center">SR</th>
              </tr>
            </thead>
            <tbody className="text-subheading">
              {bat.map((r, i) => (
                <tr
                  key={r.playerId || r.name || i}
                  className={`border-b border-secondary ${
                    i === 0 ? "bg-orange-500/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-space">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-heading whitespace-nowrap">
                    {r.name}
                    {i === 0 && (
                      <CapBadge label="Orange Cap" cls="bg-orange-500" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <TeamChip name={r.team} size="sm" />
                      {r.team}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.innings}
                  </td>
                  <td className="px-4 py-3 text-center font-space font-bold text-heading">
                    {r.runs}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.highest ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.fours}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.sixes}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.fifties}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.hundreds}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {rate(r.average)}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {rate(r.strikeRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {bowl.length > 0 && (
        <Section
          title="Most Wickets"
          badge={
            <span className="text-[10px] font-black uppercase tracking-wider bg-violet-600 text-white rounded-full px-2 py-0.5">
              Purple Cap Race
            </span>
          }
        >
          <table className="w-full min-w-[720px] text-left tabular-nums">
            <thead className="text-heading text-xs uppercase tracking-wider">
              <tr className="border-b-2 border-secondary">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Bowler</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">Inn</th>
                <th className="px-4 py-3 text-center">Wkts</th>
                <th className="px-4 py-3 text-center">Runs</th>
                <th className="px-4 py-3 text-center">Mdn</th>
                <th className="px-4 py-3 text-center">Best</th>
                <th className="px-4 py-3 text-center">Econ</th>
                <th className="px-4 py-3 text-center">Avg</th>
              </tr>
            </thead>
            <tbody className="text-subheading">
              {bowl.map((r, i) => (
                <tr
                  key={r.playerId || r.name || i}
                  className={`border-b border-secondary ${
                    i === 0 ? "bg-violet-500/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-space">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-heading whitespace-nowrap">
                    {r.name}
                    {i === 0 && (
                      <CapBadge label="Purple Cap" cls="bg-violet-600" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <TeamChip name={r.team} size="sm" />
                      {r.team}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.innings}
                  </td>
                  <td className="px-4 py-3 text-center font-space font-bold text-heading">
                    {r.wickets}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.runsConceded}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.maidens}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {r.best ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {rate(r.economy)}
                  </td>
                  <td className="px-4 py-3 text-center font-space">
                    {rate(r.average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
};

export default TournamentStats;
