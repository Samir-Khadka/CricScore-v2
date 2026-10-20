import { AlertCircle, Inbox, Loader2 } from "lucide-react";

/** Shared loading / error / empty states so no page fails silently. */

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-subheading">
      <Loader2 className="animate-spin text-[#cc66ff]" size={32} />
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
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 px-5 py-2 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-[#cc66ff] to-[#00dbde] cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 px-4 text-center text-subheading">
      <Inbox size={30} className="text-secondary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card w-full md:w-100 lg:w-72 h-72 rounded-lg shadow-md border-2 border-secondary/40 p-4 animate-pulse">
      <div className="h-5 w-2/3 rounded bg-secondary" />
      <div className="h-4 w-1/3 rounded bg-secondary mt-2" />
      <div className="space-y-4 mt-10">
        <div className="flex justify-between">
          <div className="h-6 w-24 rounded bg-secondary" />
          <div className="h-6 w-16 rounded bg-secondary" />
        </div>
        <div className="flex justify-between">
          <div className="h-6 w-24 rounded bg-secondary" />
          <div className="h-6 w-16 rounded bg-secondary" />
        </div>
        <div className="h-8 w-full rounded bg-secondary" />
      </div>
    </div>
  );
}
