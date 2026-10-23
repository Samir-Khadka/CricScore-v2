import { Spinner, ErrorBox, EmptyBox } from "./States";
import TeamChip from "./TeamChip";

/**
 * League standings table.
 * Props: { rows, loading, error, onRetry }
 * rows: [{ team, played, won, lost, tied, points, nrr, form }]
 * form: ["W" | "L" | "T"] with the most recent result last.
 */
const FORM_STYLES = {
  W: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
  L: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30",
  T: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30",
};

const FormChips = ({ form }) => {
  if (!Array.isArray(form) || form.length === 0) {
    return <span className="text-secondary">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      {form.map((f, i) => (
        <span
          key={i}
          title={
            f === "W" ? "Won" : f === "L" ? "Lost" : "Tied / no result"
          }
          className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ring-1 ${
            FORM_STYLES[f] || FORM_STYLES.T
          }`}
        >
          {f}
        </span>
      ))}
    </span>
  );
};
const PointsTable = ({ rows, loading, error, onRetry }) => {
  if (loading) return <Spinner label="Loading points table…" />;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0)
    return <EmptyBox message="No standings available yet." />;

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="data-table min-w-[660px]">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Team</th>
            <th scope="col" className="num">P</th>
            <th scope="col" className="num">W</th>
            <th scope="col" className="num">L</th>
            <th scope="col" className="num">T</th>
            <th scope="col" className="num">Pts</th>
            <th scope="col" className="num">NRR</th>
            <th scope="col">Form</th>
          </tr>
        </thead>
        <tbody className="text-subheading">
          {rows.map((r, i) => (
            <tr key={r.teamId || r.team || i}>
              <td className="font-space">{i + 1}</td>
              <td className="font-semibold text-heading">
                <span className="flex items-center gap-2.5">
                  <TeamChip name={r.team} size="sm" />
                  {r.team}
                </span>
              </td>
              <td className="num">{r.played}</td>
              <td className="num">{r.won}</td>
              <td className="num">{r.lost}</td>
              <td className="num">{r.tied}</td>
              <td className="num font-bold text-heading">{r.points}</td>
              <td className="num">
                {typeof r.nrr === "number"
                  ? r.nrr > 0
                    ? `+${r.nrr.toFixed(3)}`
                    : r.nrr.toFixed(3)
                  : "—"}
              </td>
              <td className="whitespace-nowrap">
                <FormChips form={r.form} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PointsTable;
