import TimelineItem from "../TimelineItem";
import { ballLabels, ballSymbol, eventCommentary } from "../../lib/cricket";

/** The last six balls of the current innings, newest first. */
function RecentBalls({ events }) {
  const recentEvents = (events || []).slice(-6);
  const recentLabels = ballLabels(events || []).slice(-6);
  if (recentEvents.length === 0) return null;
  return (
  <div className="mt-5">
    <p className="text-sm font-bold text-subheading mb-2">
      Recent balls
    </p>
    <div className="space-y-1.5">
      {recentEvents
        .map((ev, i) => ({ ev, label: recentLabels[i] }))
        .reverse()
        .map(({ ev, label }, i) => (
          <div
            key={ev._id || i}
            className="flex items-center gap-3 bg-card ring-1 ring-black/5 dark:ring-white/10 rounded-xl px-3 py-2 shadow-sm"
          >
            <span className="font-space font-bold text-subheading text-sm w-10 tabular-nums">
              {label}
            </span>
            <span className="flex-1 text-sm text-heading truncate">
              {eventCommentary(ev)}
            </span>
            <TimelineItem result={ballSymbol(ev)} />
          </div>
        ))}
    </div>
  </div>
  );
}

export default RecentBalls;
