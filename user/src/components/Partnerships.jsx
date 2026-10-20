import { Users } from "lucide-react";

/**
 * Partnership stands for one innings, in order.
 * Props: { partnerships }
 * partnerships: [{ batsmen: [{id, name}, {id, name}], runs, balls,
 *                  wicket: number|null, retiredHurt, ongoing }]
 */
const Partnerships = ({ partnerships }) => {
  const list = partnerships || [];
  if (list.length === 0) return null;

  return (
    <div className="w-full surface-card overflow-hidden">
      <div className="px-5 py-4 border-b card-border flex items-center gap-2">
        <Users size={18} className="text-emerald-500" />
        <p className="text-lg text-heading font-bold">Partnerships</p>
      </div>
      <ul>
        {list.map((p, i) => {
          const [a, b] = p.batsmen || [];
          const status = p.ongoing
            ? { text: "Unbeaten", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30" }
            : p.retiredHurt
              ? { text: "Retired hurt", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30" }
              : p.wicket != null
                ? { text: `Wicket ${p.wicket}`, cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30" }
                : null;
          return (
            <li
              key={i}
              className="flex items-center justify-between gap-3 px-5 py-3 border-b card-border last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-heading font-semibold truncate">
                  {a?.name || "—"}
                  <span className="text-secondary font-normal"> &amp; </span>
                  {b?.name || "—"}
                </p>
                {status && (
                  <span
                    className={`inline-block mt-1 text-[10px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ring-1 ${status.cls}`}
                  >
                    {status.text}
                  </span>
                )}
              </div>
              <p className="font-space font-bold text-lg text-heading tabular-nums shrink-0">
                {p.runs}
                <span className="text-sm text-subheading font-semibold">
                  {" "}
                  ({p.balls})
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Partnerships;
