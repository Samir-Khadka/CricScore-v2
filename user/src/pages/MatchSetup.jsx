import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Play,
  ShieldAlert,
} from "lucide-react";
import { ErrorBox, Spinner } from "../components/States";
import { FormError, RoleChip, SectionHead } from "../components/OrgBits";
import { api, getScorerId, unwrap } from "../lib/api";
import { ghostBtnCls, primaryBtnCls } from "../lib/formStyles";
import { fetchSquad, matchHasXI } from "../lib/organizer";

const idOf = (v) => (v && typeof v === "object" ? String(v._id) : String(v));

/* ------------------------------ team picker ------------------------------- */

function TeamPicker({ teamName, players, pick, onToggle, onCaptain }) {
  const { selected, captain } = pick;
  const full = selected.length >= 11;
  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-space font-bold text-lg text-heading">{teamName}</p>
        <span
          className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
            selected.length === 11
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          }`}
        >
          {selected.length} / 11 selected
        </span>
      </div>
      <p className="text-xs text-secondary mt-1">
        Tick 11 players, then mark one as captain (C).
      </p>
      <div className="mt-3 divide-y divide-[var(--color-card-border)]">
        {players.map((p) => {
          const name = p.name;
          const isSel = selected.includes(name);
          const isCap = captain === name;
          return (
            <div
              key={name}
              role="button"
              tabIndex={0}
              onClick={() => onToggle(name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(name);
                }
              }}
              className={`flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg cursor-pointer select-none ${
                !isSel && full ? "opacity-45" : ""
              } ${isSel ? "bg-emerald-500/5" : ""}`}
            >
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => {}}
                tabIndex={-1}
                className="h-5 w-5 shrink-0 accent-[#10b981] pointer-events-none"
              />
              <span
                className={`flex-1 font-semibold flex items-center gap-2 min-w-0 ${
                  isSel ? "text-heading" : "text-subheading"
                }`}
              >
                <span className="truncate">{name}</span>
                <RoleChip role={p.role} />
                {isCap && (
                  <span className="text-xs font-bold text-[#10b981]">(C)</span>
                )}
              </span>
              {isSel && (
                <button
                  type="button"
                  aria-pressed={isCap}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCaptain(name);
                  }}
                  className={`shrink-0 min-h-9 px-3 rounded-full text-xs font-bold cursor-pointer border-2 ${
                    isCap
                      ? "bg-gradient-to-r from-[#10b981] to-[#a3e635] text-black border-transparent"
                      : "border-secondary text-subheading"
                  }`}
                >
                  {isCap ? "Captain" : "Make C"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

const MatchSetup = () => {
  const { tournamentId, matchId } = useParams();
  const scorerId = getScorerId();

  const [match, setMatch] = useState(null);
  const [squads, setSquads] = useState({}); // teamId -> [{name, role, isCaptain}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [picks, setPicks] = useState({}); // teamId -> {selected, captain}
  const [tossWinner, setTossWinner] = useState("");
  const [decision, setDecision] = useState("bat");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const loadAll = useCallback(
    async (signal) => {
      if (!scorerId) return;
      setLoading(true);
      setError(null);
      try {
        let found = null;
        try {
          const res = await api.get(`/match/${scorerId}`, { signal });
          const list = unwrap(res) || [];
          found = list.find((m) => String(m._id) === String(matchId)) || null;
        } catch (err) {
          if (err.status !== 404) throw err;
        }
        if (!found) {
          try {
            const res = await api.get(`/match/id/${matchId}`, { signal });
            const m = unwrap(res);
            if (m && m._id) found = m;
          } catch {
            /* try the public view next */
          }
        }
        if (!found) {
          const res = await api.get(`/view/matches/${matchId}`, { signal });
          const d = unwrap(res);
          if (d?.match) found = d.match;
        }
        if (!found) throw new Error("Match not found.");
        setMatch(found);

        const aId = idOf(found.teamA_id);
        const bId = idOf(found.teamB_id);
        const [sqA, sqB] = await Promise.all([
          fetchSquad(tournamentId, aId),
          fetchSquad(tournamentId, bId),
        ]);
        setSquads({ [aId]: sqA.players, [bId]: sqB.players });
        // Preselect each squad's saved captain as the XI captain.
        const initPick = (players) => {
          const cap = players.find((p) => p.isCaptain);
          return { selected: [], captain: cap ? cap.name : null };
        };
        setPicks({ [aId]: initPick(sqA.players), [bId]: initPick(sqB.players) });
        setTossWinner((prev) => prev || aId);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [scorerId, tournamentId, matchId]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    loadAll(ctrl.signal);
    return () => ctrl.abort();
  }, [loadAll]);

  if (!scorerId) return <Navigate to="/login" replace />;

  const togglePlayer = (teamId, name) => {
    setPicks((prev) => {
      const cur = prev[teamId] || { selected: [], captain: null };
      let selected;
      let captain = cur.captain;
      if (cur.selected.includes(name)) {
        selected = cur.selected.filter((n) => n !== name);
        if (captain === name) captain = selected[0] || null;
      } else {
        if (cur.selected.length >= 11) return prev;
        selected = [...cur.selected, name];
        if (!captain) captain = selected[0];
      }
      return { ...prev, [teamId]: { selected, captain } };
    });
  };

  const setCaptain = (teamId, name) =>
    setPicks((prev) => ({
      ...prev,
      [teamId]: { ...(prev[teamId] || { selected: [], captain: null }), captain: name },
    }));

  const teamAId = match ? idOf(match.teamA_id) : null;
  const teamBId = match ? idOf(match.teamB_id) : null;
  const squadA = (teamAId && squads[teamAId]) || [];
  const squadB = (teamBId && squads[teamBId]) || [];
  const pickA = (teamAId && picks[teamAId]) || { selected: [], captain: null };
  const pickB = (teamBId && picks[teamBId]) || { selected: [], captain: null };

  const squadShort =
    match && (squadA.length < 11 || squadB.length < 11);
  const validA =
    pickA.selected.length === 11 &&
    !!pickA.captain &&
    pickA.selected.includes(pickA.captain);
  const validB =
    pickB.selected.length === 11 &&
    !!pickB.captain &&
    pickB.selected.includes(pickB.captain);
  const canSave = validA && validB && !busy;

  const save = async () => {
    setSaveError(null);
    const entry = (teamId, teamName, pick) => ({
      teamId,
      teamName,
      players: pick.selected.map((name) => ({
        name,
        isCaptain: name === pick.captain,
      })),
    });
    setBusy(true);
    try {
      await api.put(`/match/${matchId}/selectXI`, {
        tournament_id: tournamentId,
        playingXI: [
          entry(teamAId, match.teamA, pickA),
          entry(teamBId, match.teamB, pickB),
        ],
        toss: { wonBy: tossWinner || teamAId, decision },
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err.message || "Could not save the Playing XI.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="px-4 md:px-10 py-6 min-h-screen max-w-[1100px] mx-auto">
      <Link
        to={`/manage/${tournamentId}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-subheading hover:text-heading"
      >
        <ArrowLeft size={15} /> Back to tournament
      </Link>

      {loading ? (
        <Spinner label="Loading match setup…" />
      ) : error ? (
        <div className="surface-card mt-6">
          <ErrorBox message={error} onRetry={() => loadAll()} />
        </div>
      ) : !match ? (
        <div className="surface-card mt-6">
          <ErrorBox message="Match not found." onRetry={() => loadAll()} />
        </div>
      ) : saved ? (
        <div className="surface-card p-8 mt-6 text-center">
          <CheckCircle2 size={36} className="mx-auto text-[#10b981]" />
          <p className="text-2xl font-space font-bold text-heading mt-3">
            Innings created
          </p>
          <p className="text-subheading text-sm mt-2 max-w-md mx-auto">
            The Playing XIs and toss are saved for {match.teamA} vs{" "}
            {match.teamB}. Both innings are ready — open the scorer console to
            start scoring ball by ball.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to={`/score/${matchId}`} className={primaryBtnCls}>
              <Play size={17} /> Open Scorer Console
            </Link>
            <Link to={`/manage/${tournamentId}`} className={ghostBtnCls}>
              Back to Tournament
            </Link>
          </div>
        </div>
      ) : matchHasXI(match) ? (
        <div className="surface-card p-8 mt-6 text-center">
          <CheckCircle2 size={36} className="mx-auto text-[#10b981]" />
          <p className="text-2xl font-space font-bold text-heading mt-3">
            Playing XI already set
          </p>
          <p className="text-subheading text-sm mt-2 max-w-md mx-auto">
            {match.teamA} vs {match.teamB} already has its Playing XIs and
            toss saved, and the innings are created.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to={`/score/${matchId}`} className={primaryBtnCls}>
              <Play size={17} /> Open Scorer Console
            </Link>
            <Link to={`/manage/${tournamentId}`} className={ghostBtnCls}>
              Back to Tournament
            </Link>
          </div>
        </div>
      ) : squadShort ? (
        <div className="surface-card p-8 mt-6 text-center">
          <ShieldAlert size={36} className="mx-auto text-amber-500" />
          <p className="text-2xl font-space font-bold text-heading mt-3">
            Squads are not complete
          </p>
          <div className="text-subheading text-sm mt-3 space-y-1">
            {squadA.length < 11 && (
              <p>
                {match.teamA} has {squadA.length} player
                {squadA.length === 1 ? "" : "s"} — at least 11 are needed.
              </p>
            )}
            {squadB.length < 11 && (
              <p>
                {match.teamB} has {squadB.length} player
                {squadB.length === 1 ? "" : "s"} — at least 11 are needed.
              </p>
            )}
          </div>
          <p className="text-subheading text-sm mt-3">
            Add the missing players in the squad editor, then come back here.
          </p>
          <div className="mt-6">
            <Link to={`/manage/${tournamentId}`} className={primaryBtnCls}>
              Go to Squad Editor
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <SectionHead
              title="Playing XI & Toss"
              sub={`${match.teamA} vs ${match.teamB} — pick 11 players per side, mark the captains, then record the toss.`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
            <TeamPicker
              teamName={match.teamA}
              players={squadA}
              pick={pickA}
              onToggle={(name) => togglePlayer(teamAId, name)}
              onCaptain={(name) => setCaptain(teamAId, name)}
            />
            <TeamPicker
              teamName={match.teamB}
              players={squadB}
              pick={pickB}
              onToggle={(name) => togglePlayer(teamBId, name)}
              onCaptain={(name) => setCaptain(teamBId, name)}
            />
          </div>

          {/* -------------------------------- toss -------------------------------- */}
          <div className="surface-card p-5 mt-4">
            <p className="font-space font-bold text-heading flex items-center gap-2">
              <Coins size={17} className="text-[#10b981]" /> Toss
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm font-semibold text-subheading mb-2">
                  Toss won by
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: teamAId, name: match.teamA },
                    { id: teamBId, name: match.teamB },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTossWinner(t.id)}
                      className={`min-h-12 px-3 rounded-xl border-2 font-semibold cursor-pointer ${
                        tossWinner === t.id
                          ? "border-[#10b981] text-[#10b981]"
                          : "border-secondary text-subheading"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-subheading mb-2">
                  Decision
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "bat", label: "Bat first" },
                    { v: "bowl", label: "Bowl first" },
                  ].map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => setDecision(d.v)}
                      className={`min-h-12 px-3 rounded-xl border-2 font-semibold cursor-pointer ${
                        decision === d.v
                          ? "border-[#10b981] text-[#10b981]"
                          : "border-secondary text-subheading"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------- save -------------------------------- */}
          <div className="surface-card p-5 mt-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold text-subheading">
              <span className={validA ? "text-emerald-500" : ""}>
                {match.teamA}: {pickA.selected.length}/11
                {pickA.captain && pickA.selected.includes(pickA.captain)
                  ? ` · Captain: ${pickA.captain}`
                  : pickA.captain
                    ? " · captain not in XI"
                    : " · no captain"}
              </span>
              <span className={validB ? "text-emerald-500" : ""}>
                {match.teamB}: {pickB.selected.length}/11
                {pickB.captain && pickB.selected.includes(pickB.captain)
                  ? ` · Captain: ${pickB.captain}`
                  : pickB.captain
                    ? " · captain not in XI"
                    : " · no captain"}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              <FormError>{saveError}</FormError>
              <button
                type="button"
                onClick={save}
                disabled={!canSave}
                className={`${primaryBtnCls} w-full sm:w-auto`}
              >
                <CheckCircle2 size={17} />
                {busy ? "Saving…" : "Save XI & Toss — Create Innings"}
              </button>
              {!canSave && !busy && (
                <p className="text-xs text-secondary">
                  Both teams need exactly 11 players and a captain before
                  saving.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default MatchSetup;
