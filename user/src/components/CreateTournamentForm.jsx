import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { api, unwrap } from "../lib/api";
import {
  inputCls,
  labelCls,
  primaryBtnCls,
  textareaCls,
  todayStr,
} from "../lib/formStyles";
import { FormError } from "./OrgBits";

const FORMAT_PRESETS = [5, 10, 20, 50];

/**
 * Create-tournament form (contract: POST /tournament/create, then the
 * new id is resolved from GET /tournament/ by name). On success the
 * organizer lands on the tournament's manage page.
 */
export default function CreateTournamentForm({ onCreated }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("");
  const [format, setFormat] = useState("20");
  const [organizer, setOrganizer] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const overs = Number(format);
    if (!name.trim()) return setError("Tournament name is required.");
    if (!venue.trim()) return setError("Venue is required.");
    if (!location.trim()) return setError("Location is required.");
    if (!startDate || !endDate)
      return setError("Start and end dates are required.");
    if (endDate < startDate)
      return setError("End date cannot be before the start date.");
    if (!Number.isFinite(overs) || overs <= 0)
      return setError("Format must be a number of overs greater than 0.");

    setBusy(true);
    try {
      await api.post("/tournament/create", {
        tournament_name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        venue: venue.trim(),
        location: location.trim(),
        format: overs,
        organizer: organizer.trim(),
        description: description.trim(),
      });
      // Create returns a message only — resolve the id from the list.
      let newId = null;
      try {
        const res = await api.get("/tournament/");
        const list = unwrap(res) || [];
        const matches = list.filter(
          (t) => t.tournament_name === name.trim()
        );
        const found = matches[matches.length - 1];
        if (found?._id) newId = String(found._id);
      } catch {
        /* list refresh below still shows the new tournament */
      }
      if (onCreated) onCreated();
      if (newId) {
        navigate(`/manage/${newId}`);
      } else {
        setError(
          "Tournament created, but it could not be opened automatically. It is listed under My Tournaments."
        );
        setBusy(false);
      }
    } catch (err) {
      setError(err.message || "Could not create the tournament.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormError>{error}</FormError>

      <div>
        <label htmlFor="ct-name" className={labelCls}>
          Tournament name *
        </label>
        <input
          id="ct-name"
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Urlabari Premier League 2026"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ct-start" className={labelCls}>
            Start date *
          </label>
          <input
            id="ct-start"
            type="date"
            className={inputCls}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="ct-end" className={labelCls}>
            End date *
          </label>
          <input
            id="ct-end"
            type="date"
            className={inputCls}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="ct-venue" className={labelCls}>
            Venue *
          </label>
          <input
            id="ct-venue"
            className={inputCls}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. Urlabari Ground"
            required
          />
        </div>
        <div>
          <label htmlFor="ct-location" className={labelCls}>
            Location *
          </label>
          <input
            id="ct-location"
            className={inputCls}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Urlabari, Morang"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="ct-format" className={labelCls}>
          Format (overs per side) *
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="ct-format"
            type="number"
            min="1"
            className={`${inputCls} w-28`}
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            required
          />
          {FORMAT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFormat(String(p))}
              className={`min-h-11 px-4 rounded-xl border-2 font-semibold cursor-pointer ${
                String(p) === String(format)
                  ? "border-emerald-500 text-emerald-500"
                  : "border-secondary text-subheading"
              }`}
            >
              {p} ov
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="ct-organizer" className={labelCls}>
          Organizer
        </label>
        <input
          id="ct-organizer"
          className={inputCls}
          value={organizer}
          onChange={(e) => setOrganizer(e.target.value)}
          placeholder="Club / committee name"
        />
      </div>

      <div>
        <label htmlFor="ct-description" className={labelCls}>
          Description
        </label>
        <textarea
          id="ct-description"
          className={textareaCls}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything players and fans should know…"
        />
      </div>

      <button type="submit" disabled={busy} className={`${primaryBtnCls} w-full sm:w-auto`}>
        <Trophy size={18} />
        {busy ? "Creating…" : "Create Tournament"}
      </button>
    </form>
  );
}
