/** Pulsing LIVE indicator dot (expanding ring + solid core). */
const LiveDot = ({ className = "" }) => (
  <span className={`relative inline-flex h-2.5 w-2.5 shrink-0 ${className}`}>
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/25" />
  </span>
);

export default LiveDot;
