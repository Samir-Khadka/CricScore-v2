import { Spinner, ErrorBox, EmptyBox } from "./States";

/**
 * League standings table.
 * Props: { rows, loading, error, onRetry }
 * rows: [{ team, played, won, lost, tied, points, nrr }]
 */
const PointsTable = ({ rows, loading, error, onRetry }) => {
  if (loading) return <Spinner label="Loading points table…" />;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0)
    return <EmptyBox message="No standings available yet." />;

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[520px] text-left">
        <thead className="text-heading">
          <tr className="border-b-2 border-secondary">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3 text-center">P</th>
            <th className="px-4 py-3 text-center">W</th>
            <th className="px-4 py-3 text-center">L</th>
            <th className="px-4 py-3 text-center">T</th>
            <th className="px-4 py-3 text-center">Pts</th>
            <th className="px-4 py-3 text-center">NRR</th>
          </tr>
        </thead>
        <tbody className="text-subheading">
          {rows.map((r, i) => (
            <tr
              key={r.teamId || r.team || i}
              className="border-b border-secondary"
            >
              <td className="px-4 py-3 font-space">{i + 1}</td>
              <td className="px-4 py-3 font-semibold text-heading">
                {r.team}
              </td>
              <td className="px-4 py-3 text-center font-space">{r.played}</td>
              <td className="px-4 py-3 text-center font-space">{r.won}</td>
              <td className="px-4 py-3 text-center font-space">{r.lost}</td>
              <td className="px-4 py-3 text-center font-space">{r.tied}</td>
              <td className="px-4 py-3 text-center font-space font-bold text-heading">
                {r.points}
              </td>
              <td className="px-4 py-3 text-center font-space">
                {typeof r.nrr === "number"
                  ? r.nrr > 0
                    ? `+${r.nrr.toFixed(3)}`
                    : r.nrr.toFixed(3)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PointsTable;
