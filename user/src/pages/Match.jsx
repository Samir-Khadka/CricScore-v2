import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Award,
  BarChart3,
  Clipboard,
  List,
  MessageCircle,
  Trophy,
  Zap,
} from "lucide-react";
import TimelineItem from "../components/TimelineItem";
import Commentary from "../components/Commentary";
import PlayerScoreCard from "../components/PlayerScoreCard";
import Scorecard from "../components/Scorecard";
import MatchDetails from "../components/MatchDetails";
import { ErrorBox, Spinner } from "../components/States";
import { api, matchSocket, unwrap } from "../lib/api";
import {
  ballLabels,
  ballSymbol,
  eventCommentary,
  fmt2,
  inningsView,
  matchFormat,
} from "../lib/cricket";

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
                fill={o.wickets > 0 ? "#e11d48" : "url(#manhattanGrad)"}
                opacity={o.wickets > 0 ? 0.85 : 1}
              />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className="fill-[#cc66ff]"
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
            <stop offset="0%" stopColor="#cc66ff" />
            <stop offset="100%" stopColor="#00dbde" />
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

  // Live updates: the socket tells us a ball landed; refetch the detail.
  useEffect(() => {
    const socket = matchSocket(matchId);
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("matchLiveUpdate", () => fetchDetail(undefined, true));
    return () => {
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
          {view.runs}/{view.wickets}
        </p>
        <p className="text-subheading text-xs text-center font-semibold font-inter mt-2">
          ({view.oversText}
          {format ? `/${format}` : ""} ov)
        </p>
      </>
    ) : (
      <p className="text-subheading font-inter mt-3 md:mt-0">Yet to bat</p>
    );

  return (
    <div className="w-full min-h-screen flex flex-col items-center mt-6 md:mt-10 px-2">
      {/* live scorecard header */}
      <div className="w-full max-w-5xl p-4 rounded-xl border-2 border-[#cc66ff]/50 bg-card shadow-md">
        <div className="flex flex-row justify-between flex-wrap gap-2">
          <div
            className={`${
              isLive ? "text-rose-500" : "text-emerald-500"
            } font-bold px-2 rounded-xl flex flex-row items-center gap-2 uppercase text-sm`}
            aria-live="polite"
          >
            {isLive && (
              <span className="w-[10px] h-[10px] bg-rose-500 rounded-2xl animate-pulse" />
            )}
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
            <p className="text-heading font-bold text-2xl md:text-3xl">
              {match?.teamA}
            </p>
            <div className="text-center">{teamScore(teamAView)}</div>
          </div>

          <p className="text-secondary my-3 md:my-0">
            <Zap size={30} strokeWidth={1} />
          </p>

          <div className="flex flex-col md:flex-row items-center md:gap-16">
            <div className="text-center">{teamScore(teamBView)}</div>
            <p className="text-heading font-bold text-2xl md:text-3xl">
              {match?.teamB}
            </p>
          </div>
        </div>

        {/* result banner */}
        {isCompleted && match?.result && (
          <div className="w-full flex justify-center mt-2">
            <div className="text-heading bg-emerald-500/20 dark:text-emerald-400 font-medium text-lg rounded-lg p-3 text-center">
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

              <div className="bg-secondary p-3 md:w-[220px] rounded-lg">
                <div className="flex flex-col gap-y-2 text-sm font-semibold text-heading text-center">
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

            {/* this over strip */}
            {activeView.thisOver.length > 0 && (
              <div className="flex flex-row items-center flex-wrap justify-center">
                <span className="text-sm font-semibold text-secondary mr-2">
                  This over:
                </span>
                {activeView.thisOver.map((s, i) => (
                  <TimelineItem key={i} result={s} />
                ))}
              </div>
            )}
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

      {/* tabs */}
      <div
        role="tablist"
        aria-label="Match sections"
        className="w-full max-w-5xl bg-card mt-8 border-2 border-[#cc66ff]/50 flex flex-row justify-evenly items-center rounded-xl shadow-md overflow-x-auto"
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
              className={`flex-1 min-w-[110px] p-3 text-center rounded-xl cursor-pointer flex items-center justify-center gap-2 ${
                active ? "bg-[#af14fd] text-slate-100 font-semibold" : "text-heading"
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
                className={`px-4 py-2 rounded-xl font-semibold cursor-pointer border-2 ${
                  innIdx === i
                    ? "text-[#cc66ff] border-[#cc66ff]/60"
                    : "text-heading border-transparent"
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
              <MessageCircle size={20} className="inline-block mr-2 text-cyan-300" />
              <span>Live Commentary</span>
            </div>
            <div className="mt-4 max-h-[800px] overflow-y-auto p-2">
              {commentaryRows.length === 0 ? (
                <p className="text-subheading px-2">
                  No balls bowled in this innings yet.
                </p>
              ) : (
                commentaryRows.map(({ ev, label }, i) => (
                  <Commentary
                    key={ev._id || `${label}-${i}`}
                    label={label}
                    text={eventCommentary(ev)}
                    symbol={ballSymbol(ev)}
                  />
                ))
              )}
            </div>
          </div>
        ) : selectedTab === "sc" ? (
          <div>
            <div className="text-2xl text-heading font-space font-semibold px-2">
              <Clipboard size={20} className="inline-block mr-2 text-cyan-300" />
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
              <BarChart3 size={20} className="inline-block mr-2 text-cyan-300" />
              <span>Overs — Manhattan</span>
            </div>
            <div className="mt-4 bg-card border-2 border-[#cc66ff]/40 rounded-xl text-heading">
              <Manhattan overs={selectedView?.overs || []} />
            </div>
          </div>
        ) : (
          <div>
            <div className="text-2xl text-heading font-space font-semibold px-2">
              <Award size={20} className="inline-block mr-2 text-cyan-300" />
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
