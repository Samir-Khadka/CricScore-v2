import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Clock,
  LogOut,
  MapPin,
  Play,
  Plus,
  Settings2,
  Trophy,
} from "lucide-react";
import { ErrorBox, Spinner } from "../components/States";
import CreateTournamentForm from "../components/CreateTournamentForm";
import { SectionHead, StateChip } from "../components/OrgBits";
import { api, clearScorer, getScorerId, unwrap } from "../lib/api";
import { fmtDate } from "../lib/formStyles";
import { matchHasXI, matchTournamentId } from "../lib/organizer";

const ScorerMatches = () => {
  const navigate = useNavigate();
  const scorerId = getScorerId();
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tourLoading, setTourLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tourError, setTourError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadMatches = useCallback(
    async (signal) => {
      if (!scorerId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/match/${scorerId}`, { signal });
        setMatches(unwrap(res) || []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        // Backend returns 404 when the scorer has no matches yet.
        if (err.status === 404) {
          setMatches([]);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [scorerId]
  );

  const loadTournaments = useCallback(
    async (signal) => {
      if (!scorerId) return;
      setTourLoading(true);
      setTourError(null);
      try {
        const res = await api.get("/tournament/", { signal });
        setTournaments(unwrap(res) || []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (err.status === 404) {
          setTournaments([]);
        } else {
          setTourError(err.message);
        }
      } finally {
        setTourLoading(false);
      }
    },
    [scorerId]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    loadMatches(ctrl.signal);
    loadTournaments(ctrl.signal);
    return () => ctrl.abort();
  }, [loadMatches, loadTournaments]);

  if (!scorerId) return <Navigate to="/login" replace />;

  // Fallback for matches whose tournament_id is missing: resolve by name.
  const tourIdByName = new Map(
    tournaments.map((t) => [t.tournament_name, String(t._id)])
  );
  const setupPathFor = (m) => {
    const tid = matchTournamentId(m) || tourIdByName.get(m.tournament_name);
    return tid ? `/manage/${tid}/match/${m._id}/setup` : null;
  };

  const openCreate = () => {
    setShowCreate(true);
    requestAnimationFrame(() => {
      document
        .getElementById("create-tournament")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="px-4 md:px-10 py-6 min-h-screen max-w-[1100px] mx-auto">
      <div className="mt-4 flex flex-row justify-between items-center gap-3">
        <div>
          <p className="text-2xl text-heading font-space font-semibold">
            Organizer Hub
          </p>
          <p className="text-sm text-subheading mt-1">
            Create tournaments, add teams and squads, set up fixtures — then
            score them ball by ball.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearScorer();
            navigate("/login");
          }}
          className="flex items-center gap-2 px-4 min-h-11 rounded-xl border-2 border-secondary text-subheading font-semibold cursor-pointer shrink-0"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* ------------------------- My Tournaments ------------------------ */}
      <div className="mt-10">
        <SectionHead
          title="My Tournaments"
          sub="Tournaments on CricScore — manage teams, squads and fixtures."
          action={
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="min-h-11 px-4 rounded-xl font-bold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635] cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Plus size={16} /> Create Tournament
            </button>
          }
        />

        {showCreate && (
          <div id="create-tournament" className="surface-card p-5 md:p-6 mt-4">
            <p className="font-space font-bold text-heading mb-4">
              New tournament
            </p>
            <CreateTournamentForm onCreated={() => loadTournaments()} />
          </div>
        )}

        {tourLoading ? (
          <Spinner label="Loading tournaments…" />
        ) : tourError ? (
          <div className="surface-card mt-4">
            <ErrorBox message={tourError} onRetry={() => loadTournaments()} />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="mt-4 surface-card p-8 text-center border-dashed">
            <Trophy size={28} className="mx-auto text-[#10b981]" />
            <p className="text-heading font-semibold mt-3">
              No tournaments yet
            </p>
            <p className="text-subheading text-sm mt-2 max-w-md mx-auto">
              Create your first tournament, add the teams and their squads,
              schedule matches, set the Playing XI and toss — then score live.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 min-h-12 px-5 rounded-xl font-bold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635] cursor-pointer inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Tournament
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournaments.map((t) => (
              <div
                key={t._id}
                className="surface-card p-5 flex flex-col gap-3 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-space font-bold text-lg text-heading leading-snug">
                    {t.tournament_name}
                  </p>
                  {t.format != null && (
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {t.format} overs
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-secondary">
                  {(t.start_date || t.end_date) && (
                    <span>
                      <Calendar size={13} className="inline" />{" "}
                      {fmtDate(t.start_date)}
                      {t.end_date ? ` — ${fmtDate(t.end_date)}` : ""}
                    </span>
                  )}
                  {t.venue && (
                    <span>
                      <MapPin size={13} className="inline" /> {t.venue}
                    </span>
                  )}
                </div>
                <div className="mt-auto pt-1">
                  <Link
                    to={`/manage/${t._id}`}
                    className="min-h-11 px-4 rounded-xl border-2 border-secondary text-subheading font-semibold inline-flex items-center gap-2 hover:text-heading"
                  >
                    <Settings2 size={15} /> Manage
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --------------------------- My Matches -------------------------- */}
      <div className="mt-12">
        <SectionHead
          title="My Matches"
          sub="Matches you created — set the Playing XI & toss first, then Score opens the console."
        />

        {loading ? (
          <Spinner label="Loading your matches…" />
        ) : error ? (
          <div className="surface-card mt-4">
            <ErrorBox message={error} onRetry={() => loadMatches()} />
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-4 surface-card p-8 text-center">
            <p className="text-heading font-semibold">No matches yet</p>
            <p className="text-subheading text-sm mt-2">
              {tournaments.length === 0
                ? "Create a tournament first, then add a fixture from its manage page."
                : "Open a tournament above and create a fixture from its Matches panel."}
            </p>
            {tournaments.length === 0 && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-5 min-h-12 px-5 rounded-xl font-bold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635] cursor-pointer inline-flex items-center gap-2"
              >
                <Plus size={16} /> Create Tournament
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {matches.map((m) => {
              const hasXI = matchHasXI(m);
              const setupPath = setupPathFor(m);
              return (
                <div
                  key={m._id}
                  className="surface-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-space font-bold text-heading capitalize">
                        {m.tournament_name}
                      </p>
                      <StateChip state={m.matchState} />
                    </div>
                    <p className="text-lg font-bold text-heading mt-1">
                      {m.teamA}{" "}
                      <span className="text-secondary font-normal">vs</span>{" "}
                      {m.teamB}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-secondary mt-2">
                      {m.match_date && (
                        <span>
                          <Calendar size={13} className="inline" />{" "}
                          {fmtDate(m.match_date)}
                        </span>
                      )}
                      {m.match_time && (
                        <span>
                          <Clock size={13} className="inline" /> {m.match_time}
                        </span>
                      )}
                      {m.venue && (
                        <span>
                          <MapPin size={13} className="inline" /> {m.venue}
                        </span>
                      )}
                    </div>
                    {!hasXI && (
                      <p className="text-xs text-amber-500 font-semibold mt-2">
                        Playing XI &amp; toss not set yet — the console needs
                        them before scoring.
                      </p>
                    )}
                    {m.result && (
                      <p className="text-xs text-subheading font-semibold mt-2">
                        {m.result}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Link
                      to={`/match/${m._id}`}
                      className="px-4 min-h-12 flex items-center rounded-xl border-2 border-secondary text-subheading font-semibold"
                    >
                      View
                    </Link>
                    {hasXI || !setupPath ? (
                      <Link
                        to={`/score/${m._id}`}
                        className="px-5 min-h-12 flex items-center gap-2 rounded-xl font-bold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635]"
                      >
                        <Play size={16} /> Score
                      </Link>
                    ) : (
                      <Link
                        to={setupPath}
                        className="px-5 min-h-12 flex items-center gap-2 rounded-xl font-bold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635]"
                      >
                        <Settings2 size={16} /> Set Playing XI &amp; Toss
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ScorerMatches;
