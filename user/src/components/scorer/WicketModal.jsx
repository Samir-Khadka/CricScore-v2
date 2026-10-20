import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { WICKET_TYPES } from "../../lib/cricket";

const RUNS_TYPES = new Set(["run_out", "stumped"]);

/**
 * Wicket entry modal.
 * Props: { open, striker, nonStriker, fieldingSquad, onConfirm, onClose }
 * striker/nonStriker: { id, name } of the pair at the crease.
 * onConfirm({ type, playerOut, fielders, runsCompleted })
 */
export default function WicketModal({
  open,
  striker,
  nonStriker,
  fieldingSquad = [],
  onConfirm,
  onClose,
}) {
  const [type, setType] = useState("bowled");
  const [playerOut, setPlayerOut] = useState(null);
  const [fielders, setFielders] = useState([]);
  const [runs, setRuns] = useState(0);

  // Fresh state every time the modal opens (the pair at the crease changes).
  useEffect(() => {
    if (open) {
      setType("bowled");
      setPlayerOut(null);
      setFielders([]);
      setRuns(0);
    }
  }, [open ]);

  const outId = playerOut || striker?.id;
  const runsEnabled = RUNS_TYPES.has(type);
  const needsFielder = useMemo(
    () => ["caught", "stumped", "run_out"].includes(type),
    [type]
  );

  if (!open) return null;

  const toggleFielder = (id) =>
    setFielders((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );

  const batBtn = (player, label) => {
    if (!player) return null;
    const active = outId === player.id;
    return (
      <button
        type="button"
        onClick={() => setPlayerOut(player.id)}
        aria-pressed={active}
        className={`flex-1 min-h-14 px-3 rounded-xl border-2 font-semibold cursor-pointer ${
          active
            ? "border-red-500 bg-red-500/10 text-heading"
            : "border-secondary bg-secondary/40 text-subheading"
        }`}
      >
        <span className="block text-xs uppercase tracking-wide">{label}</span>
        <span className="block truncate">{player.name}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Record a wicket"
        className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl border-2 card-border shadow-xl p-4"
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-lg font-space font-bold text-red-500">
            Wicket — how out?
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-subheading hover:text-heading cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* dismissal type */}
        <div className="grid grid-cols-2 gap-2">
          {WICKET_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={`min-h-12 px-3 rounded-xl border-2 font-semibold text-sm cursor-pointer ${
                type === t.value
                  ? "border-red-500 bg-red-500/10 text-heading"
                  : "border-secondary bg-secondary/40 text-subheading"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* who is out */}
        {type !== "timed_out" && (
          <>
            <p className="text-sm font-semibold text-subheading mt-5 mb-2">
              Who is out?
            </p>
            <div className="flex gap-2">
              {batBtn(striker, "Striker")}
              {batBtn(nonStriker, "Non-striker")}
            </div>
          </>
        )}

        {/* runs completed */}
        <div className="mt-5">
          <p className="text-sm font-semibold text-subheading mb-2">
            Runs completed{" "}
            {!runsEnabled && (
              <span className="font-normal">(run out / stumped only)</span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Fewer runs"
              disabled={!runsEnabled || runs <= 0}
              onClick={() => setRuns((r) => Math.max(0, r - 1))}
              className="w-14 h-14 rounded-xl border-2 border-secondary bg-secondary/40 text-heading flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus size={20} />
            </button>
            <span className="font-space font-bold text-2xl text-heading w-10 text-center">
              {runsEnabled ? runs : 0}
            </span>
            <button
              type="button"
              aria-label="More runs"
              disabled={!runsEnabled || runs >= 3}
              onClick={() => setRuns((r) => Math.min(3, r + 1))}
              className="w-14 h-14 rounded-xl border-2 border-secondary bg-secondary/40 text-heading flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* fielders */}
        {type !== "retired_hurt" && type !== "timed_out" && (
          <div className="mt-5">
            <p className="text-sm font-semibold text-subheading mb-2">
              Fielder{needsFielder ? "" : " (optional)"} — tap to select
            </p>
            <div className="flex flex-wrap gap-2">
              {fieldingSquad.map((p) => {
                const id = String(p._id);
                const active = fielders.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleFielder(id)}
                    aria-pressed={active}
                    className={`min-h-11 px-3 rounded-full border-2 text-sm font-semibold cursor-pointer ${
                      active
                        ? "border-[#cc66ff] bg-[#cc66ff]/15 text-heading"
                        : "border-secondary bg-secondary/40 text-subheading"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
              {fieldingSquad.length === 0 && (
                <span className="text-sm text-subheading">
                  Fielding squad not available.
                </span>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            onConfirm({
              type,
              playerOut: type === "timed_out" ? striker?.id : outId,
              fielders,
              runsCompleted: runsEnabled ? runs : 0,
            })
          }
          className="w-full min-h-14 mt-6 rounded-xl font-bold text-white bg-red-600 cursor-pointer active:scale-[0.99]"
        >
          Record Wicket
        </button>
      </div>
    </div>
  );
}
