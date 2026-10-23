import { Check, X } from "lucide-react";

/**
 * Bottom-sheet player picker used by the scorer console.
 *
 * Single-select: tapping a player calls onPick(id) (parent closes).
 * Multi-select (fielders): tapping toggles via onToggle(id); Done → onConfirm.
 * Rows are ≥56px for ground use.
 */
export default function PickerSheet({
  open,
  title,
  subtitle,
  players = [],
  selected,
  multi = false,
  disabledIds,
  disabledReason,
  onPick,
  onToggle,
  onConfirm,
  onClose,
  emptyText = "No players available.",
}) {
  if (!open) return null;
  const selectedSet = new Set(
    multi ? selected || [] : selected ? [selected] : []
  );
  const disabled = disabledIds || new Set();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[3px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-lg max-h-[82vh] flex flex-col bg-card rounded-t-2xl sm:rounded-2xl ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-slide-up"
      >
        <div className="flex items-start justify-between p-4 border-b card-border">
          <div>
            <p className="text-lg font-space font-bold text-heading">{title}</p>
            {subtitle && (
              <p className="text-sm text-subheading mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-subheading hover:text-heading cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          {players.length === 0 && (
            <p className="text-subheading text-center py-8">{emptyText}</p>
          )}
          {players.map((p) => {
            const id = String(p._id);
            const isDisabled = disabled.has(id);
            const isSelected = selectedSet.has(id);
            return (
              <button
                key={id}
                type="button"
                disabled={isDisabled}
                onClick={() => (multi ? onToggle?.(id) : onPick?.(id))}
                className={`w-full min-h-14 px-4 py-3 rounded-xl flex items-center justify-between text-left border-2 transition-colors ${
                  isDisabled
                    ? "opacity-40 cursor-not-allowed border-secondary"
                    : isSelected
                      ? "border-emerald-500 bg-emerald-500/10 cursor-pointer"
                      : "border-secondary bg-secondary/40 cursor-pointer"
                }`}
              >
                <span>
                  <span className="block font-semibold text-heading">
                    {p.name}
                    {p.isCaptain ? " (c)" : ""}
                  </span>
                  <span className="block text-xs text-subheading">
                    {isDisabled && disabledReason
                      ? disabledReason
                      : p.role || ""}
                  </span>
                </span>
                {isSelected && <Check className="text-emerald-500" size={22} />}
              </button>
            );
          })}
        </div>

        {multi && (
          <div className="p-4 border-t card-border">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full min-h-14 rounded-xl font-bold text-black bg-gradient-to-r from-emerald-500 to-lime-400 cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
