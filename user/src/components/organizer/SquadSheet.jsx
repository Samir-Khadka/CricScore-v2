import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Crown,
  Hand,
  Plus,
  Save,
  Users,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FormError, FormNotice } from "../OrgBits";
import { labelCls, primaryBtnCls, rowInputCls } from "../../lib/formStyles";
import {
  DEFAULT_ROLE,
  ROLES,
  ROLE_META,
  duplicateNames,
  normalizeRole,
  parsePastedNames,
  saveSquad,
} from "../../lib/organizer";

/* ------------------------------ squad sheet ------------------------------- */

const XI_SIZE = 11;
const MAX_SQUAD = 15;

// Every sheet row carries a stable client-side key (_rk) so React can
// track rows across reorders/removals — array indices are not stable
// here because rows move. _rk is stripped before saving (the save
// payload maps explicit fields only).
let rkSeq = 0;
const nextRk = () => `row-${++rkSeq}`;
const blankRow = () => ({
  _rk: nextRk(),
  name: "",
  role: DEFAULT_ROLE,
  isCaptain: false,
});

/** Saved players → sheet rows, padded with blanks up to a full XI. */
function initialRows(squad) {
  const rows = (squad?.players || [])
    .slice(0, MAX_SQUAD)
    .map((p) => ({
      ...(p._id ? { _id: p._id } : {}),
      _rk: p._id ? `saved-${p._id}` : nextRk(),
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
          next[i] = {
            _rk: next[i]._rk,
            name: pasted[pi++],
            role: DEFAULT_ROLE,
            isCaptain: false,
          };
        }
      }
      while (pi < pasted.length && next.length < MAX_SQUAD) {
        next.push({
          _rk: nextRk(),
          name: pasted[pi++],
          role: DEFAULT_ROLE,
          isCaptain: false,
        });
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
          <Users size={17} className="text-emerald-500" />
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
              <Crown size={13} className="text-emerald-500" /> Captain:{" "}
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
              key={row._rk}
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
                      ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-black border-transparent"
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
            className="min-h-10 px-4 rounded-xl border-2 border-emerald-500 text-emerald-500 text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

export default SquadSheet;
