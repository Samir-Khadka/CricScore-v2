import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { FormError, FormNotice } from "../OrgBits";
import { api, unwrap } from "../../lib/api";
import {
  inputCls,
  labelCls,
  primaryBtnCls,
  selectCls,
  todayStr,
} from "../../lib/formStyles";
import { matchTournamentId } from "../../lib/organizer";

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

export default CreateMatchForm;
