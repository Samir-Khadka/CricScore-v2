import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Eye,
  MapPin,
  Play,
  Plus,
  Settings2,
} from "lucide-react";
import { ErrorBox, Spinner } from "../components/States";
import { FormError, FormNotice, SectionHead, StateChip } from "../components/OrgBits";
import SquadSheet from "../components/organizer/SquadSheet";
import CreateMatchForm from "../components/organizer/CreateMatchForm";
import { api, getScorerId, unwrap } from "../lib/api";
import { fmtDate, inputCls, labelCls, primaryBtnCls } from "../lib/formStyles";
import {
  fetchScorerMatches,
  fetchSquad,
  filterTournamentMatches,
  matchHasXI,
} from "../lib/organizer";

/* --------------------------------- page ----------------------------------- */

const ManageTournament = () => {
  const { tournamentId } = useParams();
  const scorerId = getScorerId();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [squads, setSquads] = useState({});
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newTeam, setNewTeam] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamError, setTeamError] = useState(null);
  const [teamNotice, setTeamNotice] = useState(null);

  const loadTeamsAndSquads = useCallback(
    async (signal) => {
      const res = await api
        .get(`/tournament/${tournamentId}/teams`, { signal })
        .catch((err) => {
          if (err.status === 404) return null;
          throw err;
        });
      const teamList = (res && unwrap(res)) || [];
      setTeams(teamList);
      const entries = await Promise.all(
        teamList.map(async (team) => [
          String(team._id),
          await fetchSquad(tournamentId, team._id),
        ])
      );
      setSquads(Object.fromEntries(entries));
      return teamList;
    },
    [tournamentId]
  );

  const loadMatchesOnly = useCallback(async () => {
    const list = await fetchScorerMatches(scorerId);
    setMatches(
      filterTournamentMatches(list, tournamentId, tournament?.tournament_name)
    );
  }, [scorerId, tournamentId, tournament]);

  const loadAll = useCallback(
    async (signal) => {
      if (!scorerId) return;
      setLoading(true);
      setError(null);
      try {
        let tour = null;
        try {
          const r = await api.get(`/tournament/${tournamentId}`, { signal });
          const t = unwrap(r);
          if (t && typeof t === "object" && (t._id || t.tournament_name))
            tour = t;
        } catch {
          /* fall back to the list below */
        }
        if (!tour) {
          const r = await api.get("/tournament/", { signal });
          const list = unwrap(r) || [];
          tour =
            list.find((t) => String(t._id) === String(tournamentId)) || null;
        }
        if (!tour) throw new Error("Tournament not found.");
        setTournament(tour);

        await loadTeamsAndSquads(signal);

        const list = await fetchScorerMatches(scorerId, { signal });
        setMatches(
          filterTournamentMatches(list, tournamentId, tour.tournament_name)
        );
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [scorerId, tournamentId, loadTeamsAndSquads]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    loadAll(ctrl.signal);
    return () => ctrl.abort();
  }, [loadAll]);

  if (!scorerId) return <Navigate to="/login" replace />;

  const addTeam = async (e) => {
    e.preventDefault();
    setTeamError(null);
    setTeamNotice(null);
    const teamName = newTeam.trim();
    if (!teamName) return setTeamError("Team name is required.");
    setTeamBusy(true);
    try {
      await api.post(`/tournament/${tournamentId}/teams`, { teamName });
      setNewTeam("");
      setTeamNotice(`Team “${teamName}” added — now enter its squad below.`);
      await loadTeamsAndSquads();
    } catch (err) {
      setTeamError(err.message || "Could not add the team.");
    } finally {
      setTeamBusy(false);
    }
  };

  const onSquadSaved = (teamId, players) => {
    setSquads((prev) => ({
      ...prev,
      [teamId]: {
        exists: true,
        names: players.map((p) => p.name),
        players,
      },
    }));
  };

  return (
    <section className="px-4 md:px-10 py-6 min-h-screen max-w-[1100px] mx-auto">
      <Link
        to="/score"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-subheading hover:text-heading"
      >
        <ArrowLeft size={15} /> Organizer Hub
      </Link>

      {loading ? (
        <Spinner label="Loading tournament…" />
      ) : error ? (
        <div className="surface-card mt-6">
          <ErrorBox message={error} onRetry={() => loadAll()} />
        </div>
      ) : !tournament ? (
        <div className="surface-card mt-6">
          <ErrorBox message="Tournament not found." onRetry={() => loadAll()} />
        </div>
      ) : (
        <>
          {/* ------------------------------ header ------------------------------ */}
          <div className="surface-card p-6 mt-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              Tournament
            </p>
            <h1 className="font-condensed font-bold uppercase text-4xl md:text-5xl text-heading leading-none mt-2">
              {tournament.tournament_name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-semibold text-subheading mt-3">
              {(tournament.start_date || tournament.end_date) && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} />
                  {fmtDate(tournament.start_date)}
                  {tournament.end_date
                    ? ` — ${fmtDate(tournament.end_date)}`
                    : ""}
                </span>
              )}
              {tournament.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} /> {tournament.venue}
                  {tournament.location ? `, ${tournament.location}` : ""}
                </span>
              )}
              {tournament.format != null && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase">
                  {tournament.format} overs
                </span>
              )}
              {tournament.organizer && (
                <span>Organizer: {tournament.organizer}</span>
              )}
            </div>
            {tournament.description && (
              <p className="text-sm text-subheading mt-3 max-w-2xl">
                {tournament.description}
              </p>
            )}
            <div className="mt-4">
              <Link
                to={`/tournament/${encodeURIComponent(tournament.tournament_name)}`}
                className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border-2 border-secondary text-subheading font-semibold"
              >
                <Eye size={15} /> Public page
              </Link>
            </div>
          </div>

          {/* --------------------------- teams & squads -------------------------- */}
          <div className="mt-10">
            <SectionHead
              title="Teams & Squads"
              sub="Add each team, then build its squad sheet — batting order, roles and captain. At least 11 players per side."
            />

            <form
              onSubmit={addTeam}
              className="surface-card p-5 mt-4 flex flex-col sm:flex-row gap-3 sm:items-end"
            >
              <div className="flex-1">
                <label htmlFor="new-team" className={labelCls}>
                  New team name
                </label>
                <input
                  id="new-team"
                  className={inputCls}
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  placeholder="e.g. Urlabari Warriors"
                />
              </div>
              <button
                type="submit"
                disabled={teamBusy}
                className={`${primaryBtnCls} shrink-0`}
              >
                <Plus size={16} />
                {teamBusy ? "Adding…" : "Add Team"}
              </button>
            </form>
            <div className="mt-3 space-y-3">
              <FormError>{teamError}</FormError>
              <FormNotice>{teamNotice}</FormNotice>
            </div>

            {teams.length === 0 ? (
              <div className="surface-card p-6 mt-2 text-center">
                <p className="text-heading font-semibold">No teams yet</p>
                <p className="text-subheading text-sm mt-1">
                  Add the first team above, then fill in its squad.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mt-2">
                {teams.map((team) => (
                  <SquadSheet
                    key={String(team._id)}
                    tourId={String(tournamentId)}
                    team={team}
                    squad={
                      squads[String(team._id)] || {
                        exists: false,
                        names: [],
                        players: [],
                      }
                    }
                    onSaved={onSquadSaved}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ------------------------------ matches ------------------------------ */}
          <div className="mt-12">
            <SectionHead
              title="Matches"
              sub="Schedule a fixture, then set the Playing XI & toss before scoring."
            />
            <div className="surface-card p-5 mt-4">
              <CreateMatchForm
                tournament={tournament}
                teams={teams}
                scorerId={scorerId}
                onCreated={() => loadMatchesOnly().catch(() => {})}
              />
            </div>

            {matches.length === 0 ? (
              <div className="surface-card p-6 mt-4 text-center">
                <p className="text-heading font-semibold">No matches yet</p>
                <p className="text-subheading text-sm mt-1">
                  Fixtures you create for this tournament will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {matches.map((m) => {
                  const hasXI = matchHasXI(m);
                  return (
                    <div
                      key={m._id}
                      className="surface-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-lg font-bold text-heading">
                            {m.teamA}{" "}
                            <span className="text-secondary font-normal">
                              vs
                            </span>{" "}
                            {m.teamB}
                          </p>
                          <StateChip state={m.matchState} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-secondary mt-1.5">
                          {m.match_date && (
                            <span>
                              <Calendar size={13} className="inline" />{" "}
                              {fmtDate(m.match_date)}
                            </span>
                          )}
                          {m.match_time && <span>{m.match_time}</span>}
                          {m.venue && (
                            <span>
                              <MapPin size={13} className="inline" /> {m.venue}
                            </span>
                          )}
                        </div>
                        {m.result && (
                          <p className="text-xs text-subheading font-semibold mt-1.5">
                            {m.result}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        <Link
                          to={`/match/${m._id}`}
                          className="px-4 min-h-12 flex items-center gap-2 rounded-xl border-2 border-secondary text-subheading font-semibold"
                        >
                          <Eye size={15} /> View
                        </Link>
                        {hasXI ? (
                          <Link
                            to={`/score/${m._id}`}
                            className={primaryBtnCls}
                          >
                            <Play size={16} /> Score
                          </Link>
                        ) : (
                          <>
                            <Link
                              to={`/score/${m._id}`}
                              className="px-4 min-h-12 flex items-center gap-2 rounded-xl border-2 border-secondary text-subheading font-semibold"
                            >
                              <Play size={15} /> Score
                            </Link>
                            <Link
                              to={`/manage/${tournamentId}/match/${m._id}/setup`}
                              className={primaryBtnCls}
                            >
                              <Settings2 size={16} /> Playing XI &amp; Toss
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default ManageTournament;
