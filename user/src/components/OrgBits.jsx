import { AlertTriangle, CheckCircle2 } from "lucide-react";
import LiveDot from "./LiveDot";

/** Match state chip — same language as the scorer match list. */
export function StateChip({ state }) {
  const s = String(state || "").toLowerCase();
  if (s === "live")
    return (
      <span className="text-rose-500 font-bold uppercase text-xs flex items-center gap-1.5">
        <LiveDot />
        Live
      </span>
    );
  if (s === "completed")
    return (
      <span className="text-emerald-500 font-bold uppercase text-xs">
        Completed
      </span>
    );
  return (
    <span className="text-amber-500 font-bold uppercase text-xs">
      {state || "Upcoming"}
    </span>
  );
}

/** Server / validation error, shown verbatim. */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="text-sm bg-red-500/15 text-red-600 dark:text-red-400 rounded-xl p-3 flex gap-2 items-start"
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

/** Success confirmation. */
export function FormNotice({ children }) {
  if (!children) return null;
  return (
    <div className="text-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl p-3 flex gap-2 items-start">
      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

/** Section heading used across the organizer pages. */
export function SectionHead({ title, sub, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-space font-bold text-heading">{title}</h2>
        {sub && <p className="text-sm text-subheading mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
