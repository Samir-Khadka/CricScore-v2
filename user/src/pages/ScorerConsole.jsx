import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import PickerSheet from "../components/scorer/PickerSheet";
import ExtraSheet from "../components/scorer/ExtraSheet";
import WicketModal from "../components/scorer/WicketModal";
import TimelineItem from "../components/TimelineItem";
import { ErrorBox, Spinner } from "../components/States";
import { api, getScorerId, unwrap } from "../lib/api";
import {
  ballLabels,
  ballSymbol,
  eventCommentary,
  fmt2,
  inningsView,
  matchFormat,
  squadPlayers,
} from "../lib/cricket";

const ZERO_EXTRAS = { wide: 0, noBall: 0, bye: 0, legBye: 0, penalty: 0 };
const RUN_BUTTONS = [0, 1, 2, 3, 4, 6];

const ScorerConsole = () => {
  const { matchId } = useParams();
  const scorerId = getScorerId();

  const [match, setMatch] = useState(null);
  const [squads, setSquads] = useState({});
  const [inningsByNum, setInningsByNum] = useState({});
  const [inningNumber, setInningNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [striker, setStriker] = useState(null);
  const [nonStriker, setNonStriker] = useState(null);
  const [bowler, setBowler] = useState(null);

  const [sheet, setSheet] = useState(null); // striker|nonStriker|bowler|wide|noball|bye|legbye|wicket
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const [resultText, setResultText] = useState(null);

  /* ------------------------------ loading ------------------------------ */

  const loadInnings = useCallback(
    async (num) => {
      try {
        const res = await api.get(
          `/ballByball/${matchId}/state?inningNumber=${num}`
        );
        const entry = {
          inning: res?.data || null,
          state: res?.state || null,
          events: res?.events || [],
        };
        setInningsByNum((prev) => ({ ...prev, [num]: entry }));
        return entry;
      } catch (err) {
        if (err.status === 404) {
          const entry = { notStarted: true, inning: null, state: null, events: [] };
          setInningsByNum((prev) => ({ ...prev, [num]: entry }));
          return entry;
        }
        const entry = { error: err.message, inning: null, state: null, events: [] };
        setInningsByNum((prev) => ({ ...prev, [num]: entry }));
        return entry;
      }
    },
    [matchId]
  );

  const loadMatch = useCallback(async () => {
    const res = await api.get(`/view/matches/${matchId}`);
    const data = unwrap(res);
    setMatch(data?.match || null);
    return data?.match || null;
  }, [matchId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const m = await loadMatch();
      if (!m) throw new Error("Match not found.");
      const tourId =
        m.tournament_id && typeof m.tournament_id === "object"
          ? m.tournament_id._id
          : m.tournament_id;
      const [sqA, sqB] = await Promise.all([
        api
          .get(`/players/${tourId}/${m.teamA_id}`)
          .then((r) => squadPlayers(r))
          .catch(() => []),
        api
          .get(`/players/${tourId}/${m.teamB_id}`)
          .then((r) => squadPlayers(r))
          .catch(() => []),
      ]);
      setSquads({ [String(m.teamA_id)]: sqA, [String(m.teamB_id)]: sqB });
      const [i1, i2] = await Promise.all([loadInnings(1), loadInnings(2)]);
      if (m.inning_in_progress === 2 && i2 && !i2.notStarted) {
        setInningNumber(2);
      } else if (i1?.state?.isComplete && i2 && !i2.notStarted) {
        setInningNumber(2);
      }
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadMatch, loadInnings]);

  useEffect(() => {
    if (!scorerId) return;
    loadAll();
  }, [scorerId, loadAll]);

  /* --------------------------- derived data ---------------------------- */

  const cur = inningsByNum[inningNumber] || null;
  const view = useMemo(
    () => (cur && !cur.notStarted ? inningsView(cur.inning, cur.state) : null),
    [cur]
  );
  const format = matchFormat(match) || 20;
  const maxBowlerBalls = Math.ceil(format / 5) * 6;

  const battingTeamId = cur?.inning?.batting_team
    ? String(cur.inning.batting_team)
    : null;
  const fieldingTeamId = cur?.inning?.fielding_team
    ? String(cur.inning.fielding_team)
    : null;
  const battingSquad = useMemo(
    () => (battingTeamId && squads[battingTeamId]) || [],
    [battingTeamId, squads]
  );
  const fieldingSquad = useMemo(
    () => (fieldingTeamId && squads[fieldingTeamId]) || [],
    [fieldingTeamId, squads]
  );
  const battingTeamName =
    battingTeamId === String(match?.teamA_id) ? match?.teamA : match?.teamB;
  const fieldingTeamName =
    fieldingTeamId === String(match?.teamA_id) ? match?.teamA : match?.teamB;

  const batsmanById = useMemo(() => {
    const map = {};
    (view?.batsmen || []).forEach((b) => {
      if (b.id) map[String(b.id)] = b;
    });
    return map;
  }, [view]);

  const bowlerById = useMemo(() => {
    const map = {};
    (view?.bowlers || []).forEach((b) => {
      if (b.id) map[String(b.id)] = b;
    });
    return map;
  }, [view]);

  const playerName = useCallback(
    (id) => {
      if (!id) return null;
      const sid = String(id);
      return (
        batsmanById[sid]?.name ||
        [...battingSquad, ...fieldingSquad].find(
          (p) => String(p._id) === sid
        )?.name ||
        "Select player"
      );
    },
    [batsmanById, battingSquad, fieldingSquad]
  );

  const overStart = (view?.thisOver?.length ?? 0) === 0;
  const lastOverBowler = useMemo(() => {
    if (cur?.state?.lastOverBowler) return String(cur.state.lastOverBowler);
    if (!overStart || !view || view.legalBalls === 0) return null;
    const evs = cur?.events || [];
    return evs.length ? String(evs[evs.length - 1].bowler) : null;
  }, [cur, overStart, view]);

  const bowlerBallsBowled = (id) => bowlerById[String(id)]?.balls || 0;
  const bowlerMaxed = (id) => bowlerBallsBowled(id) >= maxBowlerBalls;

  const bowlerValid =
    !!bowler &&
    (!overStart ||
      ((lastOverBowler ? bowler !== lastOverBowler : true) &&
        !bowlerMaxed(bowler)));
  const needsBowler = !!view && !view.isComplete && !bowlerValid;
  const needsBatsman =
    !!view && !view.isComplete && (!striker || !nonStriker);
  const padDisabled =
    posting || !view || view.isComplete || needsBatsman || needsBowler;

  /* --------------------- sync selection from engine -------------------- */

  useEffect(() => {
    if (!cur || cur.notStarted || !view) return;
    const battingIds = new Set(battingSquad.map((p) => String(p._id)));
    const fieldingIds = new Set(fieldingSquad.map((p) => String(p._id)));
    const pick = (engineId, prev) => {
      if (engineId && battingIds.size === 0) return String(engineId);
      if (engineId && battingIds.has(String(engineId))) return String(engineId);
      if (prev && (battingIds.size === 0 || battingIds.has(prev))) return prev;
      return engineId ? String(engineId) : null;
    };
    setStriker((prev) => pick(cur.state?.striker ?? cur.inning?.striker, prev));
    setNonStriker((prev) =>
      pick(cur.state?.nonStriker ?? cur.inning?.non_striker, prev)
    );
    setBowler((prev) => {
      const engineId = cur.state?.currentBowler ?? cur.inning?.current_bowler;
      if (engineId && (fieldingIds.size === 0 || fieldingIds.has(String(engineId))))
        return String(engineId);
      if (prev && (fieldingIds.size === 0 || fieldingIds.has(prev))) return prev;
      return engineId ? String(engineId) : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.state, cur?.inning]);

  /* ------------------------- forced picker flow ------------------------ */

  useEffect(() => {
    if (!view || view.isComplete || posting || sheet) return;
    if (needsBatsman) {
      setSheet(!striker ? "striker" : "nonStriker");
    } else if (needsBowler) {
      setSheet("bowler");
    }
  }, [view, needsBatsman, needsBowler, striker, posting, sheet]);

  /* ------------------------------ posting ------------------------------ */

  const refreshInnings = useCallback(async () => {
    try {
      const res = await api.get(
        `/ballByball/${matchId}/state?inningNumber=${inningNumber}`
      );
      setInningsByNum((prev) => ({
        ...prev,
        [inningNumber]: {
          inning: res?.data || null,
          state: res?.state || null,
          events: res?.events || [],
        },
      }));
    } catch {
      /* keep the state from the POST response */
    }
  }, [matchId, inningNumber]);

  const postBall = useCallback(
    async (fragment) => {
      setPosting(true);
      setPostError(null);
      try {
        const payload = {
          inningNumber,
          striker,
          nonStriker,
          bowler,
          batRuns: fragment.batRuns || 0,
          extras: { ...ZERO_EXTRAS, ...(fragment.extras || {}) },
          wicket: fragment.wicket ?? null,
        };
        const res = await api.post(`/ballByball/${matchId}`, payload);
        if (res?.result) {
          setResultText(
            typeof res.result === "string" ? res.result : res.result.text
          );
        }
        if (res?.state) {
          setInningsByNum((prev) => ({
            ...prev,
            [inningNumber]: {
              inning: res.data || prev[inningNumber]?.inning || null,
              state: res.state,
              events: prev[inningNumber]?.events || [],
            },
          }));
        }
        await refreshInnings();
        if (res?.state?.isComplete) {
          await loadMatch().catch(() => {});
          if (inningNumber === 1) {
            await loadInnings(2);
            setResultText(
              (t) =>
                t ||
                `Innings complete — target ${(res.state.runs || 0) + 1}. Switch to Innings 2 to continue.`
            );
          }
        }
        setSheet(null);
      } catch (err) {
        setSheet(null);
        setPostError(err.message || "Could not save that ball. Try again.");
      } finally {
        setPosting(false);
      }
    },
    [
      matchId,
      inningNumber,
      striker,
      nonStriker,
      bowler,
      refreshInnings,
      loadMatch,
      loadInnings,
    ]
  );

  const undo = useCallback(async () => {
    setPosting(true);
    setPostError(null);
    try {
      await api.del(`/ballByball/${matchId}/last`, { inningNumber });
      setResultText(null);
      await refreshInnings();
      await loadMatch().catch(() => {});
    } catch (err) {
      setPostError(err.message || "Could not undo the last ball.");
    } finally {
      setPosting(false);
    }
  }, [matchId, inningNumber, refreshInnings, loadMatch]);

  /* ------------------------------ render ------------------------------- */

  if (!scorerId) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="min-h-[60vh]">
        <Spinner label="Loading scoring console…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[60vh]">
        <ErrorBox message={loadError} onRetry={loadAll} />
      </div>
    );
  }

  const ballsRemaining =
    view?.ballsRemaining ?? (view ? format * 6 - view.legalBalls : null);
  const runsNeeded =
    view?.runsNeeded ??
    (view?.target ? Math.max(0, view.target - view.runs) : null);

  const outIds = new Set(
    (view?.batsmen || [])
      .filter((b) => b.status === "out")
      .map((b) => String(b.id))
  );
  const retiredIds = new Set(
    (view?.batsmen || [])
      .filter((b) => b.status === "retired hurt")
      .map((b) => String(b.id))
  );
  const batsmanDisabled = (otherId, excludeRetired) => {
    const s = new Set(outIds);
    if (excludeRetired) retiredIds.forEach((id) => s.add(id));
    if (otherId) s.add(String(otherId));
    return s;
  };
  const bowlerDisabled = () => {
    const s = new Set();
    if (overStart) {
      if (lastOverBowler) s.add(lastOverBowler);
      (view?.bowlers || []).forEach((b) => {
        if (b.balls >= maxBowlerBalls) s.add(String(b.id));
      });
    }
    return s;
  };

  const recentEvents = (cur?.events || []).slice(-6);
  const recentLabels = ballLabels(cur?.events || []).slice(-6);

  const creaseRow = (label, id, figures, onTap, disabled) => (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      className="w-full min-h-14 px-4 py-2 rounded-xl border-2 border-secondary bg-secondary/40 flex items-center justify-between text-left cursor-pointer disabled:cursor-default"
    >
      <span>
        <span className="block text-[11px] uppercase tracking-wider text-secondary font-bold">
          {label}
        </span>
        <span className="block font-bold text-heading truncate max-w-[180px]">
          {id ? playerName(id) : "Tap to select"}
        </span>
      </span>
      <span className="flex items-center gap-1 text-subheading">
        <span className="font-space font-semibold text-sm">{figures}</span>
        {!disabled && <ChevronRight size={18} />}
      </span>
    </button>
  );

  const strikerFig = striker
    ? `${batsmanById[String(striker)]?.runs ?? 0} (${batsmanById[String(striker)]?.balls ?? 0})`
    : "";
  const nonStrikerFig = nonStriker
    ? `${batsmanById[String(nonStriker)]?.runs ?? 0} (${batsmanById[String(nonStriker)]?.balls ?? 0})`
    : "";
  const bowlerFig = bowler
    ? `${bowlerById[String(bowler)]?.oversText ?? "0.0"} - ${bowlerById[String(bowler)]?.wickets ?? 0}/${bowlerById[String(bowler)]?.runsConceded ?? 0}`
    : "";

  const padBtn =
    "min-h-14 rounded-xl border-2 font-space font-bold text-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-3 py-4 pb-10">
      {/* top bar */}
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/score"
          className="flex items-center gap-1 text-subheading font-semibold min-h-11 px-2"
        >
          <ArrowLeft size={18} /> My Matches
        </Link>
        <p className="font-space font-bold text-heading truncate">
          {match?.tournament_name}
        </p>
      </div>
      <p className="text-center text-subheading text-sm">
        {match?.teamA} vs {match?.teamB}
        {match?.venue ? ` · ${match.venue}` : ""}
      </p>

      {/* innings tabs */}
      <div className="grid grid-cols-2 gap-2 mt-4" role="tablist" aria-label="Innings">
        {[1, 2].map((n) => (
          <button
            key={n}
            role="tab"
            aria-selected={inningNumber === n}
            onClick={() => {
              setInningNumber(n);
              setPostError(null);
              if (!inningsByNum[n]) loadInnings(n);
            }}
            className={`min-h-12 rounded-xl font-bold cursor-pointer ${
              inningNumber === n
                ? "bg-[#af14fd] text-white"
                : "bg-card border-2 card-border text-heading"
            }`}
          >
            Innings {n}
          </button>
        ))}
      </div>

      {!cur ? (
        <Spinner label="Loading innings…" />
      ) : cur.notStarted ? (
        <div className="mt-6 bg-card border-2 card-border rounded-xl p-6 text-center">
          <p className="text-heading font-bold">
            Innings {inningNumber} has not started
          </p>
          <p className="text-subheading text-sm mt-2">
            {inningNumber === 1
              ? "This match has not been set up for scoring yet. The playing XI and innings must be created first, then scoring can begin here."
              : "The second innings begins automatically once the first innings is complete."}
          </p>
        </div>
      ) : cur.error ? (
        <ErrorBox message={cur.error} onRetry={() => loadInnings(inningNumber)} />
      ) : (
        <>
          {/* score header */}
          <div className="mt-4 bg-card border-2 border-[#cc66ff]/50 rounded-xl p-4 shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-heading text-lg leading-tight">
                  {battingTeamName}
                </p>
                <p className="text-xs text-subheading">
                  vs {fieldingTeamName} · {format} overs
                </p>
              </div>
              {view?.freeHit && (
                <span className="bg-amber-500 text-black text-xs font-black px-2.5 py-1 rounded-full animate-pulse">
                  FREE HIT
                </span>
              )}
            </div>
            <div className="flex items-end justify-between mt-2 flex-wrap gap-2">
              <p className="font-space font-black text-4xl text-heading">
                {view?.runs}/{view?.wickets}
                <span className="text-lg text-subheading font-semibold ml-2">
                  ({view?.oversText} ov)
                </span>
              </p>
              <div className="text-right text-sm font-semibold text-subheading">
                <p>
                  CRR{" "}
                  <span className="font-space text-heading">
                    {fmt2(view?.crr)}
                  </span>
                </p>
                {inningNumber === 2 && view?.target ? (
                  <p>
                    Need{" "}
                    <span className="font-space text-heading">
                      {runsNeeded}
                    </span>{" "}
                    off{" "}
                    <span className="font-space text-heading">
                      {ballsRemaining}
                    </span>{" "}
                    · RRR{" "}
                    <span className="font-space text-heading">
                      {fmt2(view?.rrr)}
                    </span>
                  </p>
                ) : (
                  <p>
                    Projected{" "}
                    <span className="font-space text-heading">
                      {view?.projectedScore ??
                        Math.round((view?.crr || 0) * format)}
                    </span>
                  </p>
                )}
              </div>
            </div>
            {view?.thisOver?.length > 0 && (
              <div className="flex items-center flex-wrap mt-3">
                <span className="text-xs font-bold text-secondary mr-1">
                  This over:
                </span>
                {view.thisOver.map((s, i) => (
                  <TimelineItem key={i} result={s} />
                ))}
              </div>
            )}
          </div>

          {/* result / completion banner */}
          {(resultText || view?.isComplete || match?.result) && (
            <div className="mt-3 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-xl p-3 text-center">
              <Trophy className="inline text-emerald-500" size={18} />{" "}
              <span className="font-semibold text-heading">
                {resultText ||
                  match?.result ||
                  (inningNumber === 1
                    ? `Innings complete — target ${(view?.runs || 0) + 1}.`
                    : "Innings complete.")}
              </span>
            </div>
          )}

          {/* post error */}
          {postError && (
            <div
              role="alert"
              className="mt-3 bg-red-500/15 border-2 border-red-500/40 rounded-xl p-3 flex items-start justify-between gap-2"
            >
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {postError}
              </span>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setPostError(null)}
                className="text-red-500 cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* crease card */}
          <div className="mt-4 space-y-2">
            {creaseRow(
              "Striker *",
              striker,
              strikerFig,
              () => setSheet("striker"),
              !!view?.isComplete
            )}
            {creaseRow(
              "Non-striker",
              nonStriker,
              nonStrikerFig,
              () => setSheet("nonStriker"),
              !!view?.isComplete
            )}
            {creaseRow(
              overStart ? "Bowler (new over)" : "Bowler",
              bowler,
              bowlerFig,
              () => overStart && setSheet("bowler"),
              !!view?.isComplete || !overStart
            )}
            {!overStart && (
              <p className="text-xs text-secondary px-1">
                Bowler can be changed at the end of the over.
              </p>
            )}
          </div>

          {/* setup prompts */}
          {!view?.isComplete && (needsBatsman || needsBowler) && (
            <button
              type="button"
              onClick={() =>
                setSheet(needsBatsman ? (!striker ? "striker" : "nonStriker") : "bowler")
              }
              className="w-full min-h-12 mt-3 rounded-xl bg-amber-500/20 border-2 border-amber-500/60 text-heading font-bold cursor-pointer"
            >
              {needsBatsman
                ? "Select the batsman at the crease to continue"
                : "Select a bowler for the new over to continue"}
            </button>
          )}

          {/* ball pad */}
          <div className="mt-4" aria-busy={posting}>
            <div className="grid grid-cols-6 gap-2">
              {RUN_BUTTONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={padDisabled}
                  onClick={() => postBall({ batRuns: n })}
                  className={`${padBtn} ${
                    n === 4
                      ? "bg-purple-700 text-white border-purple-700"
                      : n === 6
                        ? "bg-blue-700 text-white border-blue-700"
                        : "bg-card border-secondary text-heading"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <button
                type="button"
                disabled={padDisabled}
                onClick={() => setSheet("wide")}
                className={`${padBtn} bg-amber-500/90 text-white border-amber-500 text-base`}
              >
                WD
              </button>
              <button
                type="button"
                disabled={padDisabled}
                onClick={() => setSheet("noball")}
                className={`${padBtn} bg-orange-500/90 text-white border-orange-500 text-base`}
              >
                NB
              </button>
              <button
                type="button"
                disabled={padDisabled}
                onClick={() => setSheet("bye")}
                className={`${padBtn} bg-card border-secondary text-heading text-base`}
              >
                BYE
              </button>
              <button
                type="button"
                disabled={padDisabled}
                onClick={() => setSheet("legbye")}
                className={`${padBtn} bg-card border-secondary text-heading text-base`}
              >
                LB
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                disabled={padDisabled}
                onClick={() => setSheet("wicket")}
                className={`${padBtn} bg-red-600 text-white border-red-600 tracking-wide`}
              >
                WICKET
              </button>
              <button
                type="button"
                disabled={posting || (cur?.events?.length ?? 0) === 0}
                onClick={undo}
                className={`${padBtn} bg-secondary text-heading border-secondary`}
              >
                <RotateCcw size={20} className="mr-2" /> UNDO
              </button>
            </div>
            {posting && (
              <p className="text-center text-sm text-subheading mt-2 animate-pulse">
                Saving ball…
              </p>
            )}
          </div>

          {/* recent balls */}
          {recentEvents.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-bold text-subheading mb-2">
                Recent balls
              </p>
              <div className="space-y-1.5">
                {recentEvents
                  .map((ev, i) => ({ ev, label: recentLabels[i] }))
                  .reverse()
                  .map(({ ev, label }, i) => (
                    <div
                      key={ev._id || i}
                      className="flex items-center gap-3 bg-card border card-border rounded-lg px-3 py-2"
                    >
                      <span className="font-space font-bold text-subheading text-sm w-10">
                        {label}
                      </span>
                      <span className="flex-1 text-sm text-heading truncate">
                        {eventCommentary(ev)}
                      </span>
                      <TimelineItem result={ballSymbol(ev)} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ------------------------------ sheets ------------------------------ */}
      <PickerSheet
        open={sheet === "striker"}
        title="Select striker"
        subtitle={battingTeamName}
        players={battingSquad}
        selected={striker}
        disabledIds={batsmanDisabled(nonStriker, !!view?.awaitingBatsman)}
        disabledReason="Not available"
        onPick={(id) => {
          setStriker(id);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
        emptyText="Batting squad not available. Add players for this team first."
      />
      <PickerSheet
        open={sheet === "nonStriker"}
        title="Select non-striker"
        subtitle={battingTeamName}
        players={battingSquad}
        selected={nonStriker}
        disabledIds={batsmanDisabled(striker, !!view?.awaitingBatsman)}
        disabledReason="Not available"
        onPick={(id) => {
          setNonStriker(id);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
        emptyText="Batting squad not available. Add players for this team first."
      />
      <PickerSheet
        open={sheet === "bowler"}
        title="Select bowler"
        subtitle={`${fieldingTeamName} · max ${Math.ceil(format / 5)} overs per bowler`}
        players={fieldingSquad}
        selected={bowler}
        disabledIds={bowlerDisabled()}
        disabledReason={
          overStart
            ? "Bowled the last over or reached the over limit"
            : "Unavailable"
        }
        onPick={(id) => {
          setBowler(id);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
        emptyText="Fielding squad not available. Add players for this team first."
      />

      <ExtraSheet
        open={sheet === "wide"}
        title="Wide — total wide runs"
        groups={[
          {
            options: [1, 2, 3, 4, 5].map((n) => ({
              label: n === 1 ? "WD" : `WD +${n - 1}`,
              payload: { batRuns: 0, extras: { ...ZERO_EXTRAS, wide: n } },
            })),
          },
        ]}
        onChoose={(p) => postBall(p)}
        onClose={() => setSheet(null)}
      />
      <ExtraSheet
        open={sheet === "noball"}
        title="No ball (+1 penalty run)"
        groups={[
          {
            label: "Runs off the bat",
            options: [0, 1, 2, 3, 4, 6].map((n) => ({
              label: `NB +${n}`,
              payload: { batRuns: n, extras: { ...ZERO_EXTRAS, noBall: 1 } },
            })),
          },
          {
            label: "Byes",
            options: [1, 2, 3, 4].map((n) => ({
              label: `NB +${n}b`,
              payload: {
                batRuns: 0,
                extras: { ...ZERO_EXTRAS, noBall: 1, bye: n },
              },
            })),
          },
          {
            label: "Leg byes",
            options: [1, 2, 3, 4].map((n) => ({
              label: `NB +${n}lb`,
              payload: {
                batRuns: 0,
                extras: { ...ZERO_EXTRAS, noBall: 1, legBye: n },
              },
            })),
          },
        ]}
        onChoose={(p) => postBall(p)}
        onClose={() => setSheet(null)}
      />
      <ExtraSheet
        open={sheet === "bye"}
        title="Byes"
        groups={[
          {
            options: [1, 2, 3, 4].map((n) => ({
              label: `${n}b`,
              payload: { batRuns: 0, extras: { ...ZERO_EXTRAS, bye: n } },
            })),
          },
        ]}
        onChoose={(p) => postBall(p)}
        onClose={() => setSheet(null)}
      />
      <ExtraSheet
        open={sheet === "legbye"}
        title="Leg byes"
        groups={[
          {
            options: [1, 2, 3, 4].map((n) => ({
              label: `${n}lb`,
              payload: { batRuns: 0, extras: { ...ZERO_EXTRAS, legBye: n } },
            })),
          },
        ]}
        onChoose={(p) => postBall(p)}
        onClose={() => setSheet(null)}
      />

      <WicketModal
        open={sheet === "wicket"}
        striker={
          striker ? { id: striker, name: playerName(striker) } : null
        }
        nonStriker={
          nonStriker ? { id: nonStriker, name: playerName(nonStriker) } : null
        }
        fieldingSquad={fieldingSquad}
        onConfirm={({ type, playerOut, fielders, runsCompleted }) => {
          postBall({
            batRuns: runsCompleted,
            extras: { ...ZERO_EXTRAS },
            wicket: { type, playerOut, fielders },
          });
        }}
        onClose={() => setSheet(null)}
      />
    </div>
  );
};

export default ScorerConsole;
