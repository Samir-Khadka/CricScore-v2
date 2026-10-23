import { Link } from "react-router-dom";
import { ChevronRight, Trophy } from "lucide-react";

const Tournaments = (props) => {
  return (
    <Link
      // Pass already-fetched tournaments to the info page to avoid a refetch.
      to={`/tournament/${encodeURIComponent(props.name)}`}
      state={{ tourInfo: props.tour }}
      className="surface-card card-link flex items-center gap-3 pl-4 pr-3 py-3.5 font-semibold text-heading hover:ring-emerald-500/40"
      style={{ borderLeftWidth: 3, borderLeftColor: "#10b981" }}
    >
      <span className="h-9 w-9 rounded-xl bg-emerald-500/12 ring-1 ring-emerald-500/25 text-emerald-500 grid place-items-center shrink-0">
        <Trophy size={17} aria-hidden="true" />
      </span>
      <p className="truncate">{props.name}</p>
      <ChevronRight size={17} className="text-secondary shrink-0" aria-hidden="true" />
    </Link>
  );
};

export default Tournaments;
