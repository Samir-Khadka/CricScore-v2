import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Award,
  BarChart3,
  Clipboard,
  List,
  MessageCircle,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import TimelineItem from "../components/TimelineItem";
import Commentary from "../components/Commentary";
import TeamChip from "../components/TeamChip";
import LiveDot from "../components/LiveDot";
import PlayerScoreCard from "../components/PlayerScoreCard";
import Scorecard from "../components/Scorecard";
import MatchDetails from "../components/MatchDetails";
import WinMeter from "../components/WinMeter";
import WormChart from "../components/WormChart";
import Partnerships from "../components/Partnerships";
import { ErrorBox, Spinner } from "../components/States";
import { api, matchSocket, unwrap } from "../lib/api";
import {
  ballLabels,
  ballSymbol,
  eventCommentary,
  fmt2,
  inningsView,
  matchFormat,
  teamColorHex,
} from "../lib/cricket";

const MILESTONE_ICONS = {
  team: {
    Icon: Trophy,
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  batsman: {
    Icon: Award,
    cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  partnership: {
    Icon: Users,
    cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
};

const TABS = [
  { id: "com", label: "Commentary", icon: MessageCircle },
  { id: "sc", label: "Scorecard", icon: Clipboard },
  { id: "overs", label: "Overs", icon: BarChart3 },
  { id: "det", label: "Details", icon: List },
];

/** Manhattan chart: runs per over as inline SVG bars, wickets marked. */
function Manhattan({ overs }) {
  if (!overs || overs.length === 0) {
    return <p className="text-subheading px-6 py-4">No overs bowled yet.</p>;
  }
  const max = Math.max(...overs.map((o) => o.runs), 6);
  const barW = 34;
  const gap = 10;
  const height = 180;
  const width = Math.max(overs.length * (barW + gap) + gap, 320);
  return (
    <div className="overflow-x-auto px-4 py-4">
      <svg
        width={width}
        height={height + 30}
        role="img"
        aria-label="Runs per over chart"
        className="mx-auto block"
      >
        {overs.map((o, i) => {
          const h = Math.max(2, (o.runs / max) * height);
          const x = gap + i * (barW + gap);
          const y = height - h;
          return (
            <g key={o.over}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={o.wickets > 0 ? "#f43f5e" : "url(#manhattanGrad)"}
                opacity={o.wickets > 0 ? 0.92 : 1}
                className="manhattan-bar"
                style={{ animationDelay: `${i * 45}ms` }}
              />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className="fill-emerald-500 tabular-nums"
              >
                {o.runs}
                {o.wickets > 0 ? `/${o.wickets}w` : ""}
              </text>
              <text
                x={x + barW / 2}
                y={height + 20}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                opacity="0.6"
              >
                {o.over}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="manhattanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <p className="text-center text-xs text-subheading mt-1">
        Runs per over · red bars mark overs with wickets
      </p>
    </div>
  );
}

const Match = () => {
  const { matchId } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [selectedTab, setSelectedTab] = useState("com");
  const [innIdx, setInnIdx] = useState(0);
  const fetchingRef = useRef(false);

  const fetchDetail = useCallback(
    async (signal, silent = false) => {
      if (fetchingRef.current && silent) return;
      fetchingRef.current = true;
      if (!silent) setLoading(true);
      try {
        const res = await api.get(`/view/matches/${matchId}`, { signal });
        const data = unwrap(res);
        setDetail(data);
        setError(null);
        // Default to the live (or latest) innings once data first arrives.
        setInnIdx((prev) => {
          const list = data?.innings || [];
          if (list.length === 0) return 0;
          if (prev >= list.length) return list.length - 1;
          if (!silent) {
            const liveIdx = list.findIndex(
              (d) => d.inning?.status === "inProgress"
            );
            return liveIdx >= 0 ? liveIdx : list.length - 1;
          }
          return prev;
        });
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (!silent) setError(err.message);
      } finally {
        fetchingRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [matchId]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setDetail(null);
    fetchDetail(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchDetail]);

  // Live updates: the socket tells us a ball landed. Its payload is the
  // raw innings snapshots — not the engine-derived state, events and
  // milestones this page renders — so the detail is still refetched,
  // but coalesced: a burst of balls collapses into one refetch, and a
  // refetch already in flight is followed by at most one more.
  const refetchTimerRef = useRef(null);
  useEffect(() => {
    const socket = matchSocket(matchId);
    const scheduleRefetch = () => {
      if (refetchTimerRef.current) return;
      refetchTimerRef.current = setTimeout(() => {
        refetchTimerRef.current = null;
        if (fetchingRef.current) {
          scheduleRefetch();
          return;
        }
        fetchDetail(undefined, true);
      }, 350);
    };
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("matchLiveUpdate", scheduleRefetch);
    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = null;
      socket.off("matchLiveUpdate");
      socket.disconnect();
    };
  }, [matchId, fetchDetail]);

  const match = detail?.match || null;
  const inningsList = useMemo(() => detail?.innings || [], [detail]);

  const views = useMemo(
    () => inningsList.map((d) => inningsView(d?.inning, d?.state)),
    [inningsList]
  );

  const teamAView = useMemo(() => {
    const i = inningsList.findIndex(
      (d) => String(d?.inning?.batting_team) === String(match?.teamA_id)
    );
    return i >= 0 ? views[i] : null;
  }, [inningsList, views, match]);

  const teamBView = useMemo(() => {
    const i = inningsList.findIndex(
      (d) => String(d?.inning?.batting_team) === String(match?.teamB_id)
    );
    return i >= 0 ? views[i] : null;
  }, [inningsList, views, match]);

  const activeIdx = useMemo(() => {
    const live = inningsList.findIndex(
      (d) => d?.inning?.status === "inProgress"
    );
    return live >= 0 ? live : inningsList.length - 1;
  }, [inningsList]);

  const activeView = activeIdx >= 0 ? views[activeIdx] : null;
  const selected = inningsList[innIdx] || null;
  const selectedView = views[innIdx] || null;
  const format = matchFormat(match);
  const isLive = String(match?.matchState || "").toLowerCase() === "live";
  const isCompleted =
    String(match?.matchState || "").toLowerCase() === "completed";

  const strikerBat = activeView?.batsmen.find(
    (b) => String(b.id) === String(activeView?.strikerId) && b.batting
  );
  const nonStrikerBat = activeView?.batsmen.find(
    (b) => String(b.id) === String(activeView?.nonStrikerId) && b.batting
  );
  const creaseBatsmen = [strikerBat, nonStrikerBat].filter(Boolean);
  if (creaseBatsmen.length === 0 && activeView) {
    creaseBatsmen.push(...activeView.batsmen.filter((b) => b.batting));
  }
  const currentBowler =
    activeView?.bowlers.find(
      (b) => String(b.id) === String(activeView?.currentBowlerId)
    ) || activeView?.bowlers[activeView.bowlers.length - 1];

  const partnership = activeView?.currentPair;
  const partnerNames = partnership
    ? {
        runs: partnership.runs,
        balls: partnership.balls,
      }
    : null;

  // Win probability for team A (0–100) for the meter: while live it comes
  // from the current innings' engine state (only chases carry one); for a
  // completed match it settles at 100/0 from the recorded winner.
  const winMeter = useMemo(() => {
    if (!match || inningsList.length === 0) return null;
    const idx = isLive ? activeIdx : inningsList.length - 1;
    const d = inningsList[idx];
    if (!d) return null;
    const wp = d.state?.winProbability;
    const battingIsA =
      String(d.inning?.batting_team) === String(match.teamA_id);
    let aPct = null;
    if (isCompleted && match.winner) {
      aPct = String(match.winner) === String(match.teamA_id) ? 100 : 0;
    } else if (wp) {
      aPct = battingIsA ? wp.batting : wp.bowling;
    }
    if (aPct === null || aPct === undefined) return null;
    return { aPct };
  }, [match, inningsList, activeIdx, isLive, isCompleted]);

  // Worm graph series: cumulative runs after each over, per innings.
  const wormSeries = useMemo(() => {
    const out = [];
    inningsList.forEach((d, i) => {
      const v = views[i];
      if (!v?.overs?.length) return;
      const name =
        String(d?.inning?.batting_team) === String(match?.teamA_id)
          ? match?.teamA
          : match?.teamB;
      let cum = 0;
      const points = [{ over: 0, runs: 0, overWickets: 0 }];
      for (const o of v.overs) {
        cum += o.runs;
        points.push({ over: o.over, runs: cum, overWickets: o.wickets || 0 });
      }
      out.push({
        name,
        color: teamColorHex(name),
        points,
        finalRuns: cum,
        finalWickets: v.wickets,
      });
    });
    return out;
  }, [inningsList, views, match]);

  const selectedMilestones = useMemo(
    () => selected?.milestones || [],
    [selected]
  );

  const selectedEvents = useMemo(
    () => selected?.events || [],
    [selected]
  );
  const labels = useMemo(() => ballLabels(selectedEvents), [selectedEvents]);
  const commentaryRows = useMemo(
    () =>
      selectedEvents
        .map((ev, i) => ({ ev, label: labels[i] }))
        .reverse(),
    [selectedEvents, labels]
  );

  // Group the (newest-first) commentary rows under per-over separators,
  // with the over's run/wicket tally computed from the ball log.
  const commentaryGroups = useMemo(() => {
    const ballTotal = (ev) => {
      const ex = ev?.extras || {};
      return (
        (ev?.batRuns || 0) +
        (ex.wide || 0) +
        (ex.noBall || 0) +
        (ex.bye || 0) +
        (ex.legBye || 0) +
        (ex.penalty || 0)
      );
    };
    const groups = [];
    for (const row of commentaryRows) {
      const overIdx = String(row.label).split(".")[0];
      const isWicket =
        row.ev?.wicket?.type && row.ev.wicket.type !== "retired_hurt";
      const last = groups[groups.length - 1];
      if (last && last.overIdx === overIdx) {
        last.rows.push(row);
        last.runs += ballTotal(row.ev);
        if (isWicket) last.wickets += 1;
      } else {
        groups.push({
          overIdx,
          rows: [row],
          runs: ballTotal(row.ev),
          wickets: isWicket ? 1 : 0,
        });
      }
    }
    return groups;
  }, [commentaryRows]);

  if (loading && !detail) {
    return (
      <div className="min-h-screen">
        <Spinner label="Loading match…" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="min-h-screen">
        <ErrorBox message={error} onRetry={() => fetchDetail()} />
      </div>
    );
  }

  const teamScore = (view) =>
    view ? (
      <>
        <p className="font-bold font-space text-4xl text-heading mt-3 md:mt-0">
          <span
            key={`${view.runs}/${view.wickets}`}
            className="inline-block animate-score-pop tabular-nums"
          >
            {view.runs}/{view.wickets}
          </span>
        </p>
        <p className="text-subheading text-xs text-center font-semibold font-inter mt-2 tabular-nums">
          ({view.oversText}
          {format ? `/${format}` : ""} ov)
        </p>
      </>
    ) : (
      <p className="text-subheading font-inter mt-3 md:mt-0">Yet to bat</p>
    );

  return (
    <div className="w-full min-h-screen flex flex-col items-center mt-6 md:mt-10 px-2">
      {/* live scorecard header — sticks under the navbar while scrolling */}
      <div className="sticky top-16 z-30 w-full max-w-5xl">
        <h1 className="sr-only">
          {match?.teamA} vs {match?.teamB} — live score & scorecard
        </h1>
        <div className="glass surface-card p-4 shadow-xl">
        <div className="flex flex-row justify-between flex-wrap gap-2">
          <div
            className={`${
              isLive ? "text-rose-500" : "text-emerald-500"
            } font-bold px-2 rounded-xl flex flex-row items-center gap-2 uppercase text-sm`}
            aria-live="polite"
          >
            {isLive && <LiveDot />}
            {match?.matchState}
            {isLive && !connected && (
              <span className="text-amber-500 normal-case font-semibold text-xs">
                Reconnecting…
              </span>
            )}
          </div>
          <p className="font-semibold font-space capitalize text-subheading">
            {match?.tournament_name}
          </p>
        </div>

        {/* scores */}
        <div className="flex flex-col md:flex-row justify-evenly items-center flex-wrap py-4">
          <div className="flex flex-col md:flex-row items-center md:gap-16">
            <div className="flex items-center gap-3">
              <TeamChip name={match?.teamA} size="lg" />
              <p className="text-heading font-bold text-2xl md:text-3xl">
                {match?.teamA}
              </p>
            </div>
            <div className="text-center">{teamScore(teamAView)}</div>
          </div>

          <p className="text-secondary my-3 md:my-0">
            <Zap size={30} strokeWidth={1} />
          </p>

          <div className="flex flex-col md:flex-row items-center md:gap-16">
            <div className="text-center">{teamScore(teamBView)}</div>
            <div className="flex items-center gap-3">
              <p className="text-heading font-bold text-2xl md:text-3xl">
                {match?.teamB}
              </p>
              <TeamChip name={match?.teamB} size="lg" />
            </div>
          </div>
        </div>

        {/* this over strip (part of the sticky summary) */}
        {isLive && activeView && activeView.thisOver.length > 0 && (
          <div className="flex flex-row items-center flex-wrap justify-center mt-1 border-t card-border pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary mr-1.5">
              This over
            </span>
            {activeView.thisOver.map((s, i) => (
              <TimelineItem key={i} result={s} />
            ))}
          </div>
        )}

        {/* win probability meter */}
        {winMeter && (
          <div className="mt-3 border-t card-border pt-3">
            <WinMeter
              teamA={match?.teamA}
              teamB={match?.teamB}
              teamAPct={winMeter.aPct}
            />
          </div>
        )}
        </div>
      </div>

      {/* result + live stats card (only when it has something to show) */}
      {((isLive && activeView) ||
        (isCompleted && match?.result) ||
        match?.venue ||
        match?.toss?.wonBy) && (
      <div className="w-full max-w-5xl surface-card p-4 mt-4">
        {/* result banner */}
        {isCompleted && match?.result && (
          <div className="w-full flex justify-center mt-2">
            <div className="text-heading bg-emerald-500/15 ring-1 ring-emerald-500/25 dark:text-emerald-400 font-medium text-lg rounded-xl px-4 py-3 text-center">
              <Trophy className="inline" size={18} strokeWidth={2.5} /> &nbsp;
              <span>{match.result}</span>
            </div>
          </div>
        )}

        {/* live stats */}
        {isLive && activeView && (
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="flex flex-col md:flex-row justify-evenly items-center gap-4 w-full">
              {creaseBatsmen.map((batter) => (
                <PlayerScoreCard
                  key={batter.id || batter.name}
                  isBatsmen={true}
                  name={batter.name}
                  score={`${batter.runs} (${batter.balls})`}
                  onStrike={String(batter.id) === String(activeView.strikerId)}
                  fours={batter.fours}
                  sixes={batter.sixes}
                  sr={batter.sr}
                />
              ))}

              <div className="bg-secondary/60 ring-1 ring-black/5 dark:ring-white/10 p-3.5 md:w-[220px] rounded-xl">
                <div className="flex flex-col gap-y-2 text-sm font-semibold text-heading text-center tabular-nums">
                  <p>
                    CRR:{" "}
                    <span className="font-space">{fmt2(activeView.crr)}</span>
                  </p>
                  {activeView.inningNumber === 2 ||
                  inningsList[activeIdx]?.inning?.inningNumber === 2 ? (
                    <>
                      <p>
                        RRR:{" "}
                        <span className="font-space">
                          {fmt2(activeView.rrr)}
                        </span>
                      </p>
                      <p>
                        Need{" "}
                        <span className="font-space">
                          {activeView.runsNeeded ?? "—"}
                        </span>{" "}
                        runs in{" "}
                        <span className="font-space">
                          {activeView.ballsRemaining ??
                            (format
                              ? format * 6 - activeView.legalBalls
                              : "—")}
                        </span>{" "}
                        balls
                      </p>
                    </>
                  ) : (
                    <p>
                      Projected:{" "}
                      <span className="font-space">
                        {activeView.projectedScore ??
                          (format
                            ? Math.round(activeView.crr * format)
                            : "—")}
                      </span>
                    </p>
                  )}
                  {partnerNames && (
                    <p>
                      Partnership:{" "}
                      <span className="font-space">
                        {partnerNames.runs} ({partnerNames.balls})
                      </span>
                    </p>
                  )}
                  {activeView.freeHit && (
                    <p className="text-amber-500 font-bold">FREE HIT</p>
                  )}
                </div>
              </div>

              {currentBowler && (
                <PlayerScoreCard
                  isBatsmen={false}
                  name={currentBowler.name}
                  score={`${currentBowler.wickets} - ${currentBowler.runsConceded}`}
                  onStrike={false}
                  overs={currentBowler.oversText}
                  maiden={currentBowler.maidens}
                  econ={currentBowler.economy}
                />
              )}
            </div>

          </div>
        )}

        {/* venue + toss */}
        <div className="flex flex-row justify-between flex-wrap gap-2 mt-6 text-secondary font-medium text-sm">
          <p>{match?.venue}</p>
          {match?.toss?.wonBy && (
            <p>
              {match.toss.wonBy === match?.teamA_id ? match?.teamA : match?.teamB}{" "}
              chose to{" "}
              {match.toss.decision === "ball" ? "field" : match.toss.decision}
            </p>
          )}
        </div>
      </div>
      )}

      {/* tabs — segmented control */}
      <div
        role="tablist"
        aria-label="Match sections"
        className="w-full max-w-5xl bg-secondary/50 ring-1 ring-black/5 dark:ring-white/10 mt-8 flex flex-row gap-1 p-1.5 rounded-2xl overflow-x-auto"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = selectedTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedTab(t.id)}
              className={`tab-item flex-1 min-w-[110px] ${
                active ? "tab-item-active" : ""
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* innings switcher (scorecard / overs / commentary) */}
      {selectedTab !== "det" && inningsList.length > 0 && (
        <div className="w-full max-w-5xl mt-6 flex flex-row flex-wrap gap-3 px-2">
          {inningsList.map((d, i) => {
            const battingName =
              String(d?.inning?.batting_team) === String(match?.teamA_id)
                ? match?.teamA
                : match?.teamB;
            return (
              <button
                key={d?.inning?._id || i}
                onClick={() => setInnIdx(i)}
                className={`px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-colors duration-200 ${
                  innIdx === i
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/40"
                    : "bg-card text-subheading ring-1 ring-black/5 dark:ring-white/10 hover:text-heading"
                }`}
                aria-pressed={innIdx === i}
              >
                {battingName} — Innings {d?.inning?.inningNumber || i + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* tab panels */}
      <div className="w-full max-w-5xl mt-4 p-4 md:p-6 rounded-xl">
        {selectedTab === "com" ? (
          <div>
            <div className="text-2xl text-heading font-space font-semibold px-2">
              <MessageCircle size={20} className="inline-block mr-2 text-emerald-500" />
              <span>Live Commentary</span>
            </div>
            {selectedMilestones.length > 0 && (
              <div className="surface-card px-4 py-2 mt-4">
                <p className="px-1 pt-2 pb-1 text-[11px] font-black uppercase tracking-wider text-secondary">
                  Milestones
                </p>
                <ul>
                  {selectedMilestones.map((m, i) => {
                    const meta =
                      MILESTONE_ICONS[m.type] || MILESTONE_ICONS.team;
                    const Icon = meta.Icon;
                    return (
                      <li
                        key={`${m.label}-${i}`}
                        className="flex items-center gap-3 px-1 py-2.5 border-b card-border last:border-b-0"
                      >
                        <span
                          className={`h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 ${meta.cls}`}
                        >
                          <Icon size={15} />
                        </span>
                        <span className="text-sm font-medium text-heading flex-1 min-w-0">
                          {m.label}
                        </span>
                        <span className="text-xs font-space font-semibold text-subheading tabular-nums shrink-0">
                          at {m.runs} runs
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="mt-4 max-h-[800px] overflow-y-auto p-2">
              {commentaryGroups.length === 0 ? (
                <p className="text-subheading px-2">
                  No balls bowled in this innings yet.
                </p>
              ) : (
                commentaryGroups.map((g) => (
                  <div key={`over-${g.overIdx}`}>
                    <div className="flex items-center gap-3 mt-6 mb-3 first:mt-1 px-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/25 rounded-full px-3 py-1 shrink-0">
                        Over {Number(g.overIdx) + 1}
                      </span>
                      <span className="text-xs font-semibold text-subheading tabular-nums shrink-0">
                        {g.runs} run{g.runs === 1 ? "" : "s"}
                        {g.wickets > 0
                          ? ` · ${g.wickets} wicket${g.wickets === 1 ? "" : "s"}`
                          : ""}
                      </span>
                      <span className="flex-1 border-t card-border" />
                    </div>
                    {g.rows.map(({ ev, label }, i) => (
                      <Commentary
                        key={ev._id || `${label}-${i}`}
                        label={label}
                        text={eventCommentary(ev)}
                        symbol={ballSymbol(ev)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : selectedTab === "sc" ? (
          <div>
            <div className="text-2xl text-heading font-space font-semibold px-2">
              <Clipboard size={20} className="inline-block mr-2 text-emerald-500" />
              <span>Scorecard</span>
            </div>
            <div className="mt-4">
              <Scorecard
                teamName={
                  String(selected?.inning?.batting_team) ===
                  String(match?.teamA_id)
                    ? match?.teamA
                    : match?.teamB
                }
                view={selectedView}
              />
              {selectedView?.partnerships?.length > 0 && (
                <div className="mt-6">
                  <Partnerships partnerships={selectedView.partnerships} />
                </div>
              )}
              {inningsList.length > 0 &&
                innIdx === 0 &&
                inningsList.length === 1 && (
                  <div className="mt-6">
                    <Scorecard
                      teamName={
                        String(selected?.inning?.batting_team) ===
                        String(match?.teamA_id)
                          ? match?.teamB
                          : match?.teamA
                      }
                      view={null}
                    />
                  </div>
                )}
            </div>
          </div>
        ) : selectedTab === "overs" ? (
          <div>
            <div className="text-2xl text-heading font-space font-semibold px-2">
              <BarChart3 size={20} className="inline-block mr-2 text-emerald-500" />
              <span>Overs</span>
            </div>
            <div className="mt-4 surface-card text-heading">
              <p className="px-5 pt-4 text-sm font-bold uppercase tracking-wider text-subheading">
                Worm — cumulative runs
              </p>
              {wormSeries.length > 0 ? (
                <WormChart series={wormSeries} />
              ) : (
                <p className="text-subheading px-5 py-4">
                  No overs bowled yet.
                </p>
              )}
            </div>
            <div className="mt-4 surface-card text-heading">
              <p className="px-5 pt-4 text-sm font-bold uppercase tracking-wider text-subheading">
                Manhattan — runs per over
              </p>
              <Manhattan overs={selectedView?.overs || []} />
            </div>
          </div>
        ) : (
          <div>
            <div className="text-2xl text-heading font-space font-semibold px-2">
              <Award size={20} className="inline-block mr-2 text-emerald-500" />
              <span>Match Details</span>
            </div>
            <MatchDetails match={match} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Match;
