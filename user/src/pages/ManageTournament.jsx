import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Crown,
  Eye,
  Hand,
  MapPin,
  Play,
  Plus,
  Save,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { ErrorBox, Spinner } from "../components/States";
import { FormError, FormNotice, SectionHead, StateChip } from "../components/OrgBits";
import { api, getScorerId, unwrap } from "../lib/api";
import {
  fmtDate,
  inputCls,
  labelCls,
  primaryBtnCls,
  rowInputCls,
  selectCls,
  todayStr,
} from "../lib/formStyles";
import {
  DEFAULT_ROLE,
  ROLES,
  ROLE_META,
  duplicateNames,
  fetchSquad,
  matchHasXI,
  matchTournamentId,
  normalizeRole,
  parsePastedNames,
  saveSquad,
} from "../lib/organizer";

/* ------------------------------ squad sheet ------------------------------- */

const XI_SIZE = 11;
const MAX_SQUAD = 15;

const blankRow = () => ({ name: "", role: DEFAULT_ROLE, isCaptain: false });

/** Saved players → sheet rows, padded with blanks up to a full XI. */
function initialRows(squad) {
  const rows = (squad?.players || [])
    .slice(0, MAX_SQUAD)
    .map((p) => ({
      ...(p._id ? { _id: p._id } : {}),
      name: p.name || "",
      role: normalizeRole(p.role),
      isCaptain: !!p.isCaptain,
    }));
  while (rows.length < XI_SIZE) rows.push(blankRow());
  return rows;
}

function CheckItem({ pass, label, detail }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        pass
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      }`}
    >
      {pass ? (
        <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
      ) : (
        <AlertTriangle size={16} className="shrink-0 text-amber-500" />
      )}
      <span
        className={`font-semibold ${
          pass
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {label}
      </span>
      {detail && (
        <span className="ml-auto text-xs font-semibold text-secondary text-right">
          {detail}
        </span>
      )}
    </div>
  );
}

function SquadSheet({ tourId, team, squad, onSaved }) {
  const [rows, setRows] = useState(() => initialRows(squad));
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const exists = squad?.exists || false;

  /* ----- derived state: filled rows, rules checklist ----- */
  const filled = rows
    .map((r, i) => ({ ...r, name: r.name.trim(), index: i }))
    .filter((r) => r.name);
  const names = filled.map((r) => r.name);
  const dupes = duplicateNames(names);
  const xiFilled = filled.filter((r) => r.index < XI_SIZE).length;
  const captains = filled.filter((r) => r.isCaptain);
  const keepers = filled.filter((r) => r.role === "Wicket-Keeper");
  const captainName = captains.length === 1 ? captains[0].name : null;
  const keeperName = keepers.length === 1 ? keepers[0].name : null;

  const checks = [
    {
      key: "xi",
      pass: xiFilled >= XI_SIZE,
      label: "11 players in the XI",
      detail: `${xiFilled}/${XI_SIZE} slots filled`,
    },
    {
      key: "captain",
      pass: captains.length === 1,
      label: "Captain assigned",
      detail: captainName || "Tap C on a player",
    },
    {
      key: "keeper",
      pass: keepers.length === 1,
      label: "Wicket-keeper selected",
      detail:
        keepers.length === 0
          ? "None yet"
          : keepers.length === 1
            ? keeperName
            : `${keepers.length} keepers — pick one`,
    },
    {
      key: "dupes",
      pass: dupes.length === 0,
      label: "No duplicate names",
      detail: dupes.length ? dupes.join(", ") : "",
    },
  ];
  const matchReady = checks.every((c) => c.pass);

  /* ----- row operations ----- */
  const touch = () => setNotice(null);
  const updateRow = (i, patch) => {
    touch();
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };
  const toggleCaptain = (i) => {
    touch();
    setRows((prev) =>
      prev.map((r, j) => ({
        ...r,
        isCaptain: j === i ? !r.isCaptain : false,
      }))
    );
  };
  const moveRow = (i, dir) => {
    touch();
    setRows((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const removeRow = (i) => {
    touch();
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)
    );
  };
  const addRow = () => {
    touch();
    setRows((prev) =>
      prev.length >= MAX_SQUAD ? prev : [...prev, blankRow()]
    );
  };

  const applyPaste = () => {
    const pasted = parsePastedNames(pasteText);
    if (pasted.length === 0) return;
    touch();
    setRows((prev) => {
      const next = [...prev];
      let pi = 0;
      for (let i = 0; i < next.length && pi < pasted.length; i++) {
        if (!next[i].name.trim()) {
          next[i] = { name: pasted[pi++], role: DEFAULT_ROLE, isCaptain: false };
        }
      }
      while (pi < pasted.length && next.length < MAX_SQUAD) {
        next.push({ name: pasted[pi++], role: DEFAULT_ROLE, isCaptain: false });
      }
      return next;
    });
    setPasteText("");
    setPasteOpen(false);
  };

  const save = async () => {
    setError(null);
    setNotice(null);
    const players = filled.map((r) => ({
      ...(r._id ? { _id: r._id } : {}),
      name: r.name,
      role: r.role,
      isCaptain: r.isCaptain,
    }));
    if (players.length === 0)
      return setError("Add at least one player name.");
    if (dupes.length > 0)
      return setError(`Remove duplicate names first: ${dupes.join(", ")}`);
    setBusy(true);
    try {
      await saveSquad(tourId, team._id, players, exists);
      setNotice(
        `Squad saved — ${players.length} player${players.length === 1 ? "" : "s"}.`
      );
      onSaved(String(team._id), players);
    } catch (err) {
      setError(err.message || "Could not save the squad.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface-card p-5">
      {/* ------------------------------- header ------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-space font-bold text-heading flex items-center gap-2">
          <Users size={17} className="text-[#10b981]" />
          {team.teamName}
        </p>
        <span
          className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
            matchReady
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          }`}
        >
          {matchReady
            ? `Match ready · ${filled.length} players`
            : `${filled.length} player${filled.length === 1 ? "" : "s"} · not match ready`}
        </span>
      </div>
      {(captainName || keeperName) && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-subheading mt-2">
          {captainName && (
            <span className="inline-flex items-center gap-1.5">
              <Crown size={13} className="text-[#10b981]" /> Captain:{" "}
              {captainName}
            </span>
          )}
          {keeperName && (
            <span className="inline-flex items-center gap-1.5">
              <Hand size={13} className="text-amber-500" /> WK: {keeperName}
            </span>
          )}
        </p>
      )}

      {/* --------------------------- rules checklist --------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
        {checks.map((c) => (
          <CheckItem key={c.key} {...c} />
        ))}
      </div>

      {/* --------------------------------- rows --------------------------------- */}
      <div className="mt-4 space-y-2">
        {rows.map((row, i) => {
          const isWK = row.role === "Wicket-Keeper";
          return (
            <div
              key={i}
              className={`flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border px-2.5 py-2 bg-secondary/20 ${
                row.isCaptain
                  ? "border-emerald-500/40"
                  : isWK
                    ? "border-amber-500/30"
                    : "border-[var(--color-card-border)]"
              }`}
            >
              <span className="flex w-8 shrink-0 flex-col items-center leading-none">
                <span
                  className={`font-condensed text-2xl font-bold ${
                    i < XI_SIZE ? "text-heading" : "text-secondary"
                  }`}
                >
                  {i + 1}
                </span>
                {i >= XI_SIZE && (
                  <span className="text-[8px] font-bold uppercase tracking-widest text-secondary mt-0.5">
                    Reserve
                  </span>
                )}
                {isWK && (
                  <Hand size={11} className="text-amber-500 mt-0.5" />
                )}
              </span>

              <div className="min-w-0 flex-[1_1_150px]">
                <input
                  aria-label={`Player ${i + 1} name`}
                  className={rowInputCls}
                  value={row.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  placeholder={`Player ${i + 1}`}
                />
              </div>

              <div
                className="flex shrink-0 items-center gap-1"
                role="group"
                aria-label={`Role for player ${i + 1}`}
              >
                {ROLES.map((role) => {
                  const active = row.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      title={role}
                      aria-pressed={active}
                      onClick={() => updateRow(i, { role })}
                      className={`min-h-9 px-2 rounded-lg border text-[11px] font-bold uppercase tracking-wide cursor-pointer ${
                        active
                          ? ROLE_META[role].pill
                          : "border-secondary text-secondary hover:text-subheading"
                      }`}
                    >
                      {ROLE_META[role].short}
                    </button>
                  );
                })}
              </div>

              <div className="flex shrink-0 items-center gap-1 ml-auto">
                <button
                  type="button"
                  title={row.isCaptain ? "Captain — tap to remove" : "Make captain"}
                  aria-pressed={row.isCaptain}
                  aria-label={`Captain for player ${i + 1}`}
                  onClick={() => toggleCaptain(i)}
                  className={`h-9 w-9 rounded-full border-2 font-condensed text-base font-bold flex items-center justify-center cursor-pointer ${
                    row.isCaptain
                      ? "bg-gradient-to-r from-[#10b981] to-[#a3e635] text-black border-transparent"
                      : "border-secondary text-secondary hover:text-subheading"
                  }`}
                >
                  C
                </button>
                <button
                  type="button"
                  title="Move up"
                  aria-label={`Move player ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => moveRow(i, -1)}
                  className="h-9 w-7 flex items-center justify-center rounded-lg text-subheading hover:text-heading disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  title="Move down"
                  aria-label={`Move player ${i + 1} down`}
                  disabled={i === rows.length - 1}
                  onClick={() => moveRow(i, 1)}
                  className="h-9 w-7 flex items-center justify-center rounded-lg text-subheading hover:text-heading disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  title="Remove player"
                  aria-label={`Remove player ${i + 1}`}
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(i)}
                  className="h-9 w-7 flex items-center justify-center rounded-lg text-subheading hover:text-red-500 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------- add / paste ---------------------------- */}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_SQUAD}
          className="min-h-10 px-3.5 rounded-xl border-2 border-secondary text-subheading text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={15} /> Add player ({rows.length}/{MAX_SQUAD})
        </button>
        <button
          type="button"
          onClick={() => setPasteOpen((v) => !v)}
          aria-expanded={pasteOpen}
          className="min-h-10 px-3.5 rounded-xl border-2 border-secondary text-subheading text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Clipboard size={15} /> Paste list
        </button>
      </div>
      {pasteOpen && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`paste-${team._id}`} className={labelCls}>
            Paste names — one per line or comma-separated. They fill the
            empty rows in order as Batsmen; adjust roles after.
          </label>
          <textarea
            id={`paste-${team._id}`}
            className={`${rowInputCls} py-2.5 leading-relaxed`}
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Aashish Rai\nBibek Limbu, Chetan Rai, …"}
          />
          <button
            type="button"
            onClick={applyPaste}
            disabled={!pasteText.trim()}
            className="min-h-10 px-4 rounded-xl border-2 border-[#10b981] text-[#10b981] text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Fill rows
          </button>
        </div>
      )}

      {/* ------------------------------ save area ------------------------------ */}
      <div className="mt-4 space-y-3">
        {dupes.length > 0 && (
          <p className="text-sm text-amber-500 font-semibold">
            Duplicate names: {dupes.join(", ")} — each name can appear only
            once.
          </p>
        )}
        {filled.length > 0 && filled.length < XI_SIZE && dupes.length === 0 && (
          <p className="text-sm text-amber-500 font-semibold">
            Only {filled.length} so far — you can save now and add more
            later, but a match needs 11 per side.
          </p>
        )}

        <FormError>{error}</FormError>
        <FormNotice>{notice}</FormNotice>

        <button
          type="button"
          onClick={save}
          disabled={busy || dupes.length > 0 || filled.length === 0}
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
