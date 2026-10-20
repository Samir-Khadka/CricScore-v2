import { useNavigate } from "react-router-dom";
import { ChevronRight, Trophy } from "lucide-react";

const Tournaments = (props) => {
  const navigate = useNavigate();

  // Pass already-fetched tournaments to the info page to avoid a refetch.
  const dataToPass = { tourInfo: props.tour };

  const handleNavigate = () => {
    navigate(`/tournament/${encodeURIComponent(props.name)}`, {
      state: dataToPass,
    });
  };

  return (
    <div
      className="surface-card flex items-center gap-3 pl-4 pr-3 py-3.5 font-semibold text-heading cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:ring-emerald-500/40"
      onClick={handleNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate();
        }
      }}
    >
      <span className="h-9 w-9 rounded-xl bg-emerald-500/12 ring-1 ring-emerald-500/25 text-emerald-500 grid place-items-center shrink-0">
        <Trophy size={17} />
      </span>
      <p className="truncate">{props.name}</p>
      <ChevronRight size={17} className="text-secondary shrink-0" />
    </div>
  );
};

export default Tournaments;
