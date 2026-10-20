import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Eye,
  MapPin,
  Play,
  Plus,
  Save,
  Settings2,
  Users,
} from "lucide-react";
import { ErrorBox, Spinner } from "../components/States";
import { FormError, FormNotice, SectionHead, StateChip } from "../components/OrgBits";
import { api, getScorerId, unwrap } from "../lib/api";
import {
  fmtDate,
  inputCls,
  labelCls,
  primaryBtnCls,
  selectCls,
  textareaCls,
  todayStr,
} from "../lib/formStyles";
import {
  duplicateNames,
  fetchSquad,
  matchHasXI,
  matchTournamentId,
  parseNames,
  saveSquad,
} from "../lib/organizer";

/* ------------------------------ squad editor ------------------------------ */

function SquadEditor({ tourId, team, squad, onSaved }) {
  const [text, setText] = useState(() => (squad?.names || []).join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const names = parseNames(text);
  const dupes = duplicateNames(names);
  const exists = squad?.exists || false;

  const save = async () => {
    setError(null);
    setNotice(null);
    if (names.length === 0) return setError("Add at least one player name.");
    if (dupes.length > 0)
      return setError(`Remove duplicate names first: ${dupes.join(", ")}`);
    setBusy(true);
    try {
      await saveSquad(tourId, team._id, names, exists);
      setNotice(`Squad saved — ${names.length} player${names.length === 1 ? "" : "s"}.`);
      onSaved(String(team._id), names);
    } catch (err) {
      setError(err.message || "Could not save the squad.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-space font-bold text-heading flex items-center gap-2">
          <Users size={17} className="text-[#10b981]" />
          {team.teamName}
        </p>
        <span
          className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
            names.length >= 11
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          }`}
        >
          {names.length} player{names.length === 1 ? "" : "s"}
          {names.length >= 11 ? " · ready" : " · needs 11"}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor={`squad-${team._id}`} className={labelCls}>
            Squad — one player name per line
          </label>
          <textarea
            id={`squad-${team._id}`}
            className={textareaCls}
            rows={Math.min(14, Math.max(6, names.length + 1))}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setNotice(null);
            }}
            placeholder={"One player name per line, e.g.\nAashish Rai\nBibek Limbu\n…"}
          />
          <p className="text-xs text-secondary mt-1.5">
            Names are how players are picked for the Playing XI, so keep the
            spelling consistent. At least 11 are needed before a match can be
            set up.
          </p>
        </div>

        {dupes.length > 0 && (
          <p className="text-sm text-amber-500 font-semibold">
            Duplicate names: {dupes.join(", ")} — each name can appear only
            once.
          </p>
        )}
        {names.length > 0 && names.length < 11 && dupes.length === 0 && (
          <p className="text-sm text-amber-500 font-semibold">
            Only {names.length} so far — you can save now and add more later,
            but a match needs 11 per side.
          </p>
        )}

        <FormError>{error}</FormError>
        <FormNotice>{notice}</FormNotice>

        <button
          type="button"
          onClick={save}
          disabled={busy || dupes.length > 0 || names.length === 0}
          className={primaryBtnCls}
        >
          <Save size={16} />
          {busy ? "Saving…" : exists ? "Save Squad" : "Add Squad"}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- create match ------------------------------- */

function CreateMatchForm({ tournament, teams, scorerId, onCreated }) {
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("10:00");
  const [venue, setVenue] = useState(tournament.venue || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [createdId, setCreatedId] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setCreatedId(null);
    if (!teamAId || !teamBId) return setError("Pick both teams.");
    if (teamAId === teamBId)
      return setError("Team A and Team B must be different teams.");
    if (!date || !time) return setError("Pick a match date and time.");

    const a = teams.find((t) => String(t._id) === teamAId);
    const b = teams.find((t) => String(t._id) === teamBId);
    if (!a || !b) return setError("One of the teams could not be found.");

    setBusy(true);
    try {
      await api.post("/match", {
        tournament_id: String(tournament._id),
        tournament_name: tournament.tournament_name,
        teamA: a.teamName,
        teamB: b.teamName,
        teamA_id: a._id,
        teamB_id: b._id,
        match_date: date,
        match_time: time,
        venue: venue.trim(),
      });
      // Create returns a message only — resolve the new match id.
      let newId = null;
      try {
        const res = await api.get(`/match/${scorerId}`);
        const list = unwrap(res) || [];
        const found = list.filter(
          (m) =>
            matchTournamentId(m) === String(tournament._id) &&
            String(m.teamA_id) === String(a._id) &&
            String(m.teamB_id) === String(b._id) &&
            String(m.match_date || "").slice(0, 10) === date &&
            String(m.match_time || "").slice(0, 5) === time
        );
        const last = found[found.length - 1];
        if (last?._id) newId = String(last._id);
      } catch {
        /* the refreshed list below still shows the match */
      }
      setCreatedId(newId || "created");
      onCreated();
    } catch (err) {
      setError(err.message || "Could not create the match.");
    } finally {
      setBusy(false);
    }
  };

  if (teams.length < 2) {
    return (
      <p className="text-sm text-subheading">
        Add at least two teams (with squads) above before scheduling a match.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cm-teama" className={labelCls}>
            Team A *
          </label>
          <select
            id="cm-teama"
            className={selectCls}
            value={teamAId}
            onChange={(e) => setTeamAId(e.target.value)}
            required
          >
            <option value="">Select team…</option>
            {teams.map((t) => (
              <option key={t._id} value={String(t._id)}>
                {t.teamName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cm-teamb" className={labelCls}>
            Team B *
          </label>
          <select
            id="cm-teamb"
            className={selectCls}
            value={teamBId}
            onChange={(e) => setTeamBId(e.target.value)}
            required
          >
            <option value="">Select team…</option>
            {teams.map((t) => (
              <option key={t._id} value={String(t._id)}>
                {t.teamName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cm-date" className={labelCls}>
            Date *
          </label>
          <input
            id="cm-date"
            type="date"
            className={inputCls}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="cm-time" className={labelCls}>
            Time *
          </label>
          <input
            id="cm-time"
            type="time"
            className={inputCls}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cm-venue" className={labelCls}>
            Venue
          </label>
          <input
            id="cm-venue"
            className={inputCls}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Match venue"
          />
        </div>
      </div>

      <FormError>{error}</FormError>
      {createdId && (
        <FormNotice>
          Match created.
          {createdId !== "created" && (
            <>
              {" "}
              <Link
                to={`/manage/${tournament._id}/match/${createdId}/setup`}
                className="font-bold underline"
              >
                Set the Playing XI &amp; toss →
              </Link>
            </>
          )}
        </FormNotice>
      )}

      <button type="submit" disabled={busy} className={primaryBtnCls}>
        <Plus size={16} />
        {busy ? "Creating…" : "Create Match"}
      </button>
    </form>
  );
}

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
    try {
      const res = await api.get(`/match/${scorerId}`);
      const list = unwrap(res) || [];
      setMatches(
        list.filter((m) => {
          const tid = matchTournamentId(m);
          return tid
            ? tid === String(tournamentId)
            : tournament && m.tournament_name === tournament.tournament_name;
        })
      );
    } catch (err) {
      if (err.status !== 404) throw err;
      setMatches([]);
    }
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

        try {
          const res = await api.get(`/match/${scorerId}`, { signal });
          const list = unwrap(res) || [];
          setMatches(
            list.filter((m) => {
              const tid = matchTournamentId(m);
              return tid
                ? tid === String(tournamentId)
                : m.tournament_name === tour.tournament_name;
            })
          );
        } catch (err) {
          if (err.status !== 404) throw err;
          setMatches([]);
        }
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

  const onSquadSaved = (teamId, names) => {
    setSquads((prev) => ({
      ...prev,
      [teamId]: { exists: true, names },
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#10b981]">
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
              sub="Add each team, then enter its squad — one player name per line, at least 11."
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                {teams.map((team) => (
                  <SquadEditor
                    key={String(team._id)}
                    tourId={String(tournamentId)}
                    team={team}
                    squad={squads[String(team._id)] || { exists: false, names: [] }}
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
                              {new Date(m.match_date).toDateString()}
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
                            className="px-5 min-h-12 flex items-center gap-2 rounded-xl font-bold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635]"
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
                              className="px-5 min-h-12 flex items-center gap-2 rounded-xl font-bold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635]"
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
