import { AlertCircle, Inbox, Loader2 } from "lucide-react";

/** Shared loading / error / empty states so no page fails silently. */

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-subheading">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 px-4 text-center">
      <AlertCircle className="text-red-500" size={32} />
      <p className="text-heading font-semibold">
        {message || "Something went wrong while loading."}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary mt-1">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ message }) {
  return (
    <div className="empty-panel flex flex-col items-center justify-center gap-3 py-12 px-4 text-center text-subheading">
      <Inbox size={30} className="text-secondary" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="surface-card w-full md:w-[340px] p-5 animate-pulse overflow-hidden relative">
      <div className="shimmer absolute inset-0 pointer-events-none" />
      <div className="h-5 w-2/3 rounded-md bg-secondary" />
      <div className="h-4 w-1/3 rounded-md bg-secondary mt-2" />
      <div className="space-y-4 mt-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-secondary" />
            <div className="h-6 w-24 rounded-md bg-secondary" />
          </div>
          <div className="h-6 w-16 rounded-md bg-secondary" />
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-secondary" />
            <div className="h-6 w-24 rounded-md bg-secondary" />
          </div>
          <div className="h-6 w-16 rounded-md bg-secondary" />
        </div>
        <div className="h-8 w-full rounded-lg bg-secondary" />
      </div>
    </div>
  );
}
