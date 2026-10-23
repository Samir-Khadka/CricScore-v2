import { memo } from "react";
import { BarChart3, TableProperties, Tally5, TrendingUp } from "lucide-react";
import WinMeter from "./WinMeter";
import TeamChip from "./TeamChip";

/* ------------------------------------------------------------------ */
/* Visual mocks: each panel demonstrates the real product surface.     */
/* ------------------------------------------------------------------ */

const SAMPLE_OVERS = [
  { over: 1, runs: 4, wickets: 0 },
  { over: 2, runs: 9, wickets: 0 },
  { over: 3, runs: 2, wickets: 0 },
  { over: 4, runs: 13, wickets: 0 },
  { over: 5, runs: 6, wickets: 0 },
  { over: 6, runs: 11, wickets: 1 },
  { over: 7, runs: 8, wickets: 0 },
  { over: 8, runs: 16, wickets: 0 },
  { over: 9, runs: 5, wickets: 1 },
  { over: 10, runs: 12, wickets: 0 },
  { over: 11, runs: 7, wickets: 0 },
  { over: 12, runs: 14, wickets: 0 },
];

function MiniManhattan() {
  const max = Math.max(...SAMPLE_OVERS.map((o) => o.runs), 6);
  const barW = 20;
  const gap = 7;
  const height = 104;
  const width = SAMPLE_OVERS.length * (barW + gap) + gap;
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height + 20}`}
      role="img"
      aria-label="Sample Manhattan chart of runs per over"
      className="block"
    >
      <defs>
        <linearGradient id="featManhattan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a3e635" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {SAMPLE_OVERS.map((o, i) => {
        const h = Math.max(3, (o.runs / max) * height);
        const x = gap + i * (barW + gap);
        return (
          <g key={o.over}>
            <rect
              x={x}
              y={height - h}
              width={barW}
              height={h}
              rx={3}
              fill={o.wickets > 0 ? "#f43f5e" : "url(#featManhattan)"}
              className="manhattan-bar"
              style={{ animationDelay: `${i * 50}ms` }}
            />
            <text
              x={x + barW / 2}
              y={height - h - 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              className="fill-emerald-500 tabular-nums"
            >
              {o.runs}
            </text>
            <text
              x={x + barW / 2}
              y={height + 14}
              textAnchor="middle"
              fontSize="9"
              opacity="0.55"
              fill="currentColor"
            >
              {o.over}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const PAD_KEYS = [
  { label: "0", cls: "bg-card text-heading ring-black/10 dark:ring-white/15" },
  { label: "1", cls: "bg-card text-heading ring-black/10 dark:ring-white/15" },
  { label: "2", cls: "bg-card text-heading ring-black/10 dark:ring-white/15" },
  { label: "3", cls: "bg-card text-heading ring-black/10 dark:ring-white/15" },
  { label: "4", cls: "bg-emerald-600 text-white ring-emerald-600" },
  { label: "6", cls: "bg-emerald-500 text-white ring-emerald-500" },
  { label: "WD", cls: "bg-amber-500 text-white ring-amber-500" },
  { label: "NB", cls: "bg-amber-600 text-white ring-amber-600" },
  { label: "BYE", cls: "bg-sky-600 text-white ring-sky-600" },
  { label: "LB", cls: "bg-sky-500 text-white ring-sky-500" },
  { label: "UNDO", cls: "bg-card text-subheading ring-black/10 dark:ring-white/15" },
];

function ScorerPad() {
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-4 gap-2">
        {PAD_KEYS.map((k, i) => (
          <div
            key={`${k.label}-${i}`}
            className={`rounded-xl py-2.5 text-center font-space font-bold text-[15px] ring-1 shadow-sm ${k.cls}`}
          >
            {k.label}
          </div>
        ))}
        <div className="rounded-xl py-2.5 text-center font-space font-bold text-[15px] bg-rose-600 text-white ring-1 ring-rose-600 shadow-sm">
          WICKET
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] font-semibold text-subheading">
        One tap per ball — extras, wickets &amp; free hits handled
      </p>
    </div>
  );
}

function WinPredictor() {
  return (
    <div>
      <WinMeter teamA="Morang Kings" teamB="Jhapa Rhinos" teamAPct={64} />
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-semibold text-subheading tabular-nums">
        <span>
          Need <span className="text-heading">58 off 41</span>
        </span>
        <span>
          CRR <span className="text-heading font-space">8.92</span>
        </span>
        <span>
          RRR <span className="text-heading font-space">8.49</span>
        </span>
        <span>
          Proj <span className="text-heading font-space">178</span>
        </span>
      </div>
    </div>
  );
}

const SAMPLE_TABLE = [
  { team: "Morang Kings", p: 5, w: 4, pts: 8, nrr: "+0.842", form: ["W", "W", "L", "W"] },
  { team: "Jhapa Rhinos", p: 5, w: 3, pts: 6, nrr: "+0.215", form: ["L", "W", "W", "L"] },
  { team: "Dharan Stars", p: 5, w: 2, pts: 4, nrr: "-0.388", form: ["W", "L", "L", "T"] },
  { team: "Itahari XI", p: 5, w: 1, pts: 2, nrr: "-0.764", form: ["L", "L", "W", "L"] },
];

const FORM_CLS = {
  W: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  L: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  T: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

function MiniTable() {
  return (
    <div className="divide-y divide-[var(--color-card-border)]">
      {SAMPLE_TABLE.map((r, i) => (
        <div key={r.team} className="flex items-center gap-2.5 py-2">
          <span className="font-space text-[12px] font-bold text-secondary w-4 tabular-nums">
            {i + 1}
          </span>
          <TeamChip name={r.team} size="sm" />
          <span className="flex-1 min-w-0 truncate text-[13.5px] font-semibold text-heading">
            {r.team}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 mr-1">
            {r.form.map((f, j) => (
              <span
                key={j}
                className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded text-[9px] font-black ${FORM_CLS[f]}`}
              >
                {f}
              </span>
            ))}
          </span>
          <span className="tabular-nums text-[12px] text-subheading font-space">
            {r.pts} pts
          </span>
          <span className="tabular-nums text-[12px] text-subheading font-space w-14 text-right">
            {r.nrr}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const PANELS = [
  {
    icon: Tally5,
    chip: "bg-emerald-500/12 text-emerald-500 ring-emerald-500/25",
    title: "A scorer's pad, not a spreadsheet",
    text: "Big colour-coded keys built for the boundary rope — runs, extras, byes and full wicket flows with fielder credits. The laws are enforced for you: no consecutive overs, no seventh ball.",
    visual: <ScorerPad />,
  },
  {
    icon: TrendingUp,
    chip: "bg-rose-500/12 text-rose-500 ring-rose-500/25",
    title: "Win predictor on every chase",
    text: "The same tension the big broadcasts sell — a live win-probability meter that swings ball by ball, blending momentum, resources and wickets in hand.",
    visual: <WinPredictor />,
  },
  {
    icon: BarChart3,
    chip: "bg-sky-500/12 text-sky-500 ring-sky-500/25",
    title: "Manhattan & worm, ball by ball",
    text: "Runs per over, cumulative worms with wicket markers, partnerships and milestones — the full analytics suite, generated automatically from the ball log.",
    visual: <MiniManhattan />,
  },
  {
    icon: TableProperties,
    chip: "bg-amber-500/12 text-amber-500 ring-amber-500/25",
    title: "Standings that run themselves",
    text: "Points tables with proper net run rate (including the all-out adjustment), recent form, and Orange & Purple Cap races — updated the moment a match ends.",
    visual: <MiniTable />,
  },
];

const Features = () => {
  return (
    <div className="grid gap-5 md:grid-cols-2 mt-8">
      {PANELS.map((p) => {
        const Icon = p.icon;
        return (
          <div
            key={p.title}
            className="surface-card p-5 sm:p-6 flex flex-col transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="flex items-start gap-3.5">
              <span
                className={`h-11 w-11 rounded-2xl ring-1 grid place-items-center shrink-0 ${p.chip}`}
              >
                <Icon size={21} />
              </span>
              <div>
                <p className="font-condensed font-bold text-[22px] leading-tight tracking-wide text-heading">
                  {p.title}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-subheading">
                  {p.text}
                </p>
              </div>
            </div>
            <div className="mt-auto pt-5">
              <div className="rounded-2xl bg-secondary/40 ring-1 ring-black/5 dark:ring-white/5 px-4 py-4">
                {p.visual}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(Features);
