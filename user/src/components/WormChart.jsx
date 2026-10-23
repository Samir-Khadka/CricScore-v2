import { memo } from "react";
/**
 * Worm graph: cumulative runs after each over, one line per innings.
 * Dots on a line mark overs in which wickets fell (stacked when more
 * than one wicket fell in the same over).
 *
 * Props: { series }
 * series: [{ name, color, points: [{ over, runs, overWickets }],
 *            finalRuns, finalWickets }]
 */
const WormChart = ({ series }) => {
  const valid = (series || []).filter(
    (s) => s && Array.isArray(s.points) && s.points.length > 1
  );
  if (valid.length === 0) return null;

  const maxOver = Math.max(
    ...valid.map((s) => s.points[s.points.length - 1].over),
    1
  );
  const maxRunsRaw = Math.max(
    ...valid.map((s) => s.points[s.points.length - 1].runs),
    10
  );
  const step =
    maxRunsRaw <= 60 ? 10 : maxRunsRaw <= 150 ? 25 : 50;
  const maxRuns = Math.ceil(maxRunsRaw / step) * step;

  const padL = 38;
  const padR = 40;
  const padT = 14;
  const padB = 28;
  const plotW = Math.max(430, maxOver * 30);
  const plotH = 190;
  const width = padL + plotW + padR;
  const height = padT + plotH + padB;

  const x = (o) => padL + (o / maxOver) * plotW;
  const y = (r) => padT + plotH - (r / maxRuns) * plotH;

  const yTicks = [];
  for (let v = 0; v <= maxRuns; v += step) yTicks.push(v);
  const xStep = maxOver <= 10 ? 1 : maxOver <= 20 ? 2 : maxOver <= 30 ? 5 : 10;
  const xTicks = [];
  for (let o = 0; o <= maxOver; o += xStep) xTicks.push(o);
  if (xTicks[xTicks.length - 1] !== maxOver) xTicks.push(maxOver);

  return (
    <div className="overflow-x-auto px-4 py-4">
      {/* legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mb-2">
        {valid.map((s) => (
          <span
            key={s.name}
            className="flex items-center gap-2 text-xs font-semibold text-subheading"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.name}
            <span className="font-space tabular-nums text-heading">
              {s.finalRuns}/{s.finalWickets}
            </span>
          </span>
        ))}
      </div>

      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Cumulative runs by over (worm graph)"
        className="mx-auto block"
      >
        {/* horizontal gridlines + run axis */}
        {yTicks.map((v) => (
          <g key={`y-${v}`}>
            <line
              x1={padL}
              x2={padL + plotW}
              y1={y(v)}
              y2={y(v)}
              stroke="currentColor"
              opacity={v === 0 ? 0.35 : 0.12}
            />
            <text
              x={padL - 7}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
              opacity="0.65"
              className="tabular-nums"
            >
              {v}
            </text>
          </g>
        ))}

        {/* over axis */}
        {xTicks.map((o) => (
          <text
            key={`x-${o}`}
            x={x(o)}
            y={padT + plotH + 18}
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
            opacity="0.65"
            className="tabular-nums"
          >
            {o}
          </text>
        ))}
        <text
          x={padL + plotW / 2}
          y={height - 0}
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          letterSpacing="1.5"
          fill="currentColor"
          opacity="0.45"
        >
          OVERS
        </text>
        <text
          x={10}
          y={padT - 4}
          fontSize="10"
          fontWeight="700"
          letterSpacing="1.5"
          fill="currentColor"
          opacity="0.45"
        >
          RUNS
        </text>

        {/* innings lines */}
        {valid.map((s) => {
          const pts = s.points
            .map((p) => `${x(p.over)},${y(p.runs)}`)
            .join(" ");
          const last = s.points[s.points.length - 1];
          const first = s.points[0];
          const area = [
            `M ${x(first.over)},${y(0)}`,
            ...s.points.map((p) => `L ${x(p.over)},${y(p.runs)}`),
            `L ${x(last.over)},${y(0)}`,
            "Z",
          ].join(" ");
          return (
            <g key={s.name}>
              <path d={area} fill={s.color} opacity="0.09" />
              <polyline
                points={pts}
                fill="none"
                stroke={s.color}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* wicket markers: one dot per wicket in the over */}
              {s.points.map((p) =>
                p.overWickets > 0
                  ? Array.from({ length: p.overWickets }, (_, k) => (
                      <circle
                        key={`${p.over}-${k}`}
                        cx={x(p.over)}
                        cy={y(p.runs) - k * 8}
                        r="3.2"
                        fill="#f43f5e"
                        stroke="var(--color-card)"
                        strokeWidth="1.2"
                      />
                    ))
                  : null
              )}
              {/* end point + total */}
              <circle
                cx={x(last.over)}
                cy={y(last.runs)}
                r="4.5"
                fill={s.color}
                stroke="var(--color-card)"
                strokeWidth="2"
              />
              <text
                x={x(last.over) + 8}
                y={y(last.runs) + 4}
                fontSize="12"
                fontWeight="700"
                fill={s.color}
                className="tabular-nums"
              >
                {last.runs}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-center text-xs text-subheading mt-1">
        Cumulative runs · red dots mark wickets
      </p>
    </div>
  );
};

export default memo(WormChart);
