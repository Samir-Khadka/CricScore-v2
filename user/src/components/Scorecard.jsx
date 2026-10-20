import { fmt2 } from "../lib/cricket";
import TeamChip from "./TeamChip";

/**
 * Full scorecard for one innings.
 * Props: { teamName, view } — `view` is the normalised innings view model
 * from lib/cricket.inningsView(). A null view means "yet to bat".
 */
const Scorecard = ({ teamName, view }) => {
  if (!view) {
    return (
      <div className="w-full surface-card p-8 text-center">
        <div className="flex justify-center">
          <TeamChip name={teamName} size="lg" />
        </div>
        <p className="text-xl text-heading font-bold mt-3">{teamName}</p>
        <p className="text-subheading mt-1.5">Yet to bat</p>
      </div>
    );
  }

  const { batsmen, bowlers, extras, fallOfWickets } = view;
  const strikerId = view.strikerId ? String(view.strikerId) : null;

  return (
    <div className="w-full surface-card overflow-hidden">
      {/* heading */}
      <div className="w-full px-5 py-4 flex items-center justify-between gap-3 border-b card-border">
        <span className="flex items-center gap-3 min-w-0">
          <TeamChip name={teamName} size="md" />
          <span className="text-xl text-heading font-bold truncate">
            {teamName}
          </span>
        </span>
        <span className="font-space font-bold text-xl text-heading tabular-nums shrink-0">
          {view.runs}/{view.wickets}{" "}
          <span className="text-sm text-subheading font-semibold">
            ({view.oversText})
          </span>
        </span>
      </div>

      {/* batting table  */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] mt-2 border-b card-border tabular-nums">
          <thead className="text-heading text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6">Batting</th>
              <th>&nbsp;</th>
              <th>R</th>
              <th className="px-2">B</th>
              <th className="px-2">4s</th>
              <th className="px-2">6s</th>
              <th className="px-2">SR</th>
            </tr>
          </thead>
          <tbody className="text-subheading">
            {batsmen.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4">
                  No batting data yet.
                </td>
              </tr>
            )}
            {batsmen.map((s, i) => {
              const isStriker = strikerId && String(s.id) === strikerId;
              return (
                <tr key={s.id || i} className={s.batting ? "font-medium" : ""}>
                  <td className="px-6 py-3 border-b card-border text-heading">
                    {s.name}
                    {isStriker ? " *" : ""}
                  </td>
                  <td className="p-2 border-b card-border">
                    {s.batting
                      ? "not out"
                      : s.status === "retired hurt"
                        ? "retired hurt"
                        : s.howOut}
                  </td>
                  <td className="p-2 border-b card-border font-space">
                    {s.runs}
                  </td>
                  <td className="p-2 border-b card-border font-space">
                    {s.balls}
                  </td>
                  <td className="p-2 border-b card-border font-space">
                    {s.fours}
                  </td>
                  <td className="p-2 border-b card-border font-space">
                    {s.sixes}
                  </td>
                  <td className="p-2 border-b card-border font-space">
                    {fmt2(s.sr)}
                  </td>
                </tr>
              );
            })}
            <tr className="text-sm">
              <td className="px-6 py-2">Extras</td>
              <td className="py-2" colSpan={6}>
                {extras.total} ({extras.wide} WD, {extras.noBall} NB,{" "}
                {extras.bye} B, {extras.legBye} LB, {extras.penalty} P)
              </td>
            </tr>
            <tr className="text-lg font-bold">
              <td colSpan={2} className="px-6 py-2">
                Total
              </td>
              <td colSpan={5} className="text-heading">
                {view.runs}/{view.wickets}{" "}
                <span className="text-sm">({view.oversText} overs)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* fall of wickets  */}
      {fallOfWickets.length > 0 && (
        <div className="px-6 py-4 border-b card-border">
          <p className="text-heading font-bold mb-2">Fall of Wickets</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-subheading">
            {fallOfWickets.map((f, i) => (
              <span key={i}>
                <span className="font-space font-semibold text-heading">
                  {f.runs}-{f.wicket}
                </span>{" "}
                ({f.playerOutName}, {f.oversText} ov)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* bowling table  */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] mt-4 tabular-nums">
          <thead className="text-heading text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6">Bowling</th>
              <th>O</th>
              <th>M</th>
              <th>R</th>
              <th>W</th>
              <th>Econ</th>
              <th>NB</th>
              <th>WD</th>
            </tr>
          </thead>
          <tbody className="text-subheading">
            {bowlers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-4">
                  No bowling data yet.
                </td>
              </tr>
            )}
            {bowlers.map((s, i) => (
              <tr key={s.id || i}>
                <td className="px-6 py-2 border-b card-border text-heading">
                  {s.name}
                </td>
                <td className="p-2 border-b card-border font-space">
                  {s.oversText}
                </td>
                <td className="p-2 border-b card-border font-space">
                  {s.maidens}
                </td>
                <td className="p-2 border-b card-border font-space">
                  {s.runsConceded}
                </td>
                <td className="p-2 border-b card-border font-space">
                  {s.wickets}
                </td>
                <td className="p-2 border-b card-border font-space">
                  {fmt2(s.economy)}
                </td>
                <td className="p-2 border-b card-border font-space">
                  {s.noBall}
                </td>
                <td className="p-2 border-b card-border font-space">
                  {s.wide}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      &nbsp;
    </div>
  );
};

export default Scorecard;
