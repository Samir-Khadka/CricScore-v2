import { X } from "lucide-react";

/**
 * Bottom sheet of big option buttons for extras (wide / no-ball / bye /
 * leg-bye variants). `groups` = [{ label, options: [{ label, payload }] }].
 * Tapping an option calls onChoose(payload) with the ball payload fragment.
 */
export default function ExtraSheet({ open, title, groups = [], onChoose, onClose }) {
  if (!open) return null;
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
        aria-label={title}
        className="relative w-full sm:max-w-lg max-h-[82vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl border-2 card-border shadow-xl p-4"
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-lg font-space font-bold text-heading">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-subheading hover:text-heading cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {groups.map((g, gi) => (
          <div key={gi} className="mb-4">
            {g.label && (
              <p className="text-sm font-semibold text-subheading mb-2">
                {g.label}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {g.options.map((opt, oi) => (
                <button
                  key={oi}
                  type="button"
                  onClick={() => onChoose(opt.payload)}
                  className="min-h-14 px-2 rounded-xl border-2 border-secondary bg-secondary/40 font-space font-bold text-lg text-heading cursor-pointer active:scale-95 transition-transform"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
