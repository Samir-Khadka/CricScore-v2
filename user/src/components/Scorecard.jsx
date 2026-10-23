import { memo } from "react";
import { fmt2, teamColorHex } from "../lib/cricket";
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
        <p className="font-condensed font-bold uppercase tracking-wide text-[26px] text-heading mt-3">
          {teamName}
        </p>
        <p className="text-subheading mt-1.5">Yet to bat</p>
      </div>
    );
  }

  const { batsmen, bowlers, extras, fallOfWickets } = view;
  const strikerId = view.strikerId ? String(view.strikerId) : null;

  return (
    <div className="w-full surface-card overflow-hidden">
      {/* heading — team-colour gradient band */}
      <div
        className="w-full px-5 py-4 flex items-center justify-between gap-3 border-b card-border"
        style={{
          backgroundImage: `linear-gradient(92deg, ${teamColorHex(teamName)}30, ${teamColorHex(teamName)}0d 55%, transparent)`,
        }}
      >
        <span className="flex items-center gap-3 min-w-0">
          <TeamChip name={teamName} size="lg" />
          <span className="font-condensed font-bold uppercase tracking-wide text-[24px] leading-none text-heading truncate">
            {teamName}
          </span>
        </span>
        <span className="font-display font-black text-[26px] leading-none text-heading tabular-nums shrink-0">
          {view.runs}
          <span className="text-subheading font-extrabold">/{view.wickets}</span>{" "}
          <span className="text-sm text-subheading font-bold font-inter">
            ({view.oversText})
          </span>
        </span>
      </div>

      {/* batting table  */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] mt-2 border-b card-border tabular-nums">
          <thead className="text-heading text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-2.5">Batting</th>
              <th className="py-2.5">&nbsp;</th>
              <th className="px-2 py-2.5 text-right">R</th>
              <th className="px-2 py-2.5 text-right">B</th>
              <th className="px-2 py-2.5 text-right">4s</th>
              <th className="px-2 py-2.5 text-right">6s</th>
              <th className="px-2 py-2.5 pr-6 text-right">SR</th>
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
                <tr
                  key={s.id || i}
                  className={`row-hover transition-colors ${s.batting ? "font-medium" : ""} ${
                    isStriker ? "bg-emerald-500/[0.06]" : ""
                  }`}
                >
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
                  <td className="p-2 border-b card-border font-space text-right">
                    {s.runs}
                  </td>
                  <td className="p-2 border-b card-border font-space text-right">
                    {s.balls}
                  </td>
                  <td className="p-2 border-b card-border font-space text-right">
                    {s.fours}
                  </td>
                  <td className="p-2 border-b card-border font-space text-right">
                    {s.sixes}
                  </td>
                  <td className="p-2 pr-6 border-b card-border font-space text-right">
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
              <td colSpan={5} className="text-heading font-display font-extrabold">
                {view.runs}/{view.wickets}{" "}
                <span className="text-sm font-inter font-semibold">({view.oversText} overs)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* fall of wickets  */}
      {fallOfWickets.length > 0 && (
        <div className="px-6 py-4 border-b card-border">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-secondary mb-2">
            Fall of Wickets
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-subheading">
            {fallOfWickets.map((f) => (
              <span key={f.wicket}>
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
              <th className="px-6 py-2.5">Bowling</th>
              <th className="px-2 py-2.5 text-right">O</th>
              <th className="px-2 py-2.5 text-right">M</th>
              <th className="px-2 py-2.5 text-right">R</th>
              <th className="px-2 py-2.5 text-right">W</th>
              <th className="px-2 py-2.5 text-right">Econ</th>
              <th className="px-2 py-2.5 text-right">NB</th>
              <th className="px-2 py-2.5 pr-6 text-right">WD</th>
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
              <tr key={s.id || i} className="row-hover transition-colors">
                <td className="px-6 py-2 border-b card-border text-heading">
                  {s.name}
                </td>
                <td className="p-2 border-b card-border font-space text-right">
                  {s.oversText}
                </td>
                <td className="p-2 border-b card-border font-space text-right">
                  {s.maidens}
                </td>
                <td className="p-2 border-b card-border font-space text-right">
                  {s.runsConceded}
                </td>
                <td className="p-2 border-b card-border font-space text-right">
                  {s.wickets}
                </td>
                <td className="p-2 border-b card-border font-space text-right">
                  {fmt2(s.economy)}
                </td>
                <td className="p-2 border-b card-border font-space text-right">
                  {s.noBall}
                </td>
                <td className="p-2 pr-6 border-b card-border font-space text-right">
                  {s.wide}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pb-2" aria-hidden="true" />
    </div>
  );
};

export default memo(Scorecard);
