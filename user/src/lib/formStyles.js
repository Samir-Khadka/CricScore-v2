/**
 * Shared form styling for the organizer (scorer) area — matches the
 * classes used by Login so forms look native to the app.
 */
export const inputCls =
  "w-full min-h-12 px-4 rounded-xl border-2 border-secondary bg-secondary/30 text-heading placeholder:text-secondary outline-none focus:border-[#10b981]";

export const selectCls = `${inputCls} cursor-pointer`;

export const textareaCls = `${inputCls} py-3 leading-relaxed`;

/** Compact input for squad-sheet rows (denser than the page forms). */
export const rowInputCls =
  "w-full min-h-11 px-3 rounded-lg border-2 border-secondary bg-secondary/30 text-heading placeholder:text-secondary outline-none focus:border-[#10b981] font-semibold";

export const labelCls = "block text-sm font-semibold text-subheading mb-1.5";

export const primaryBtnCls =
  "min-h-12 px-5 rounded-xl font-bold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";

export const ghostBtnCls =
  "min-h-11 px-4 rounded-xl border-2 border-secondary text-subheading font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";

/** Local today as YYYY-MM-DD (for date inputs / API payloads). */
export function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "Mon 20 Oct 2026" style date (Intl), tolerant of bad input. */
export function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dateFmt.format(dt);
}
