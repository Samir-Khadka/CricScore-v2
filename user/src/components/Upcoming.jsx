import { Calendar, Clock, MapPin, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TeamChip from "./TeamChip";

const UpcomingCard = ({ data }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (data?._id) navigate(`/match/${data._id}`);
  };
  return (
    <div
      className="surface-card w-full md:w-[340px] p-5 flex flex-col gap-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-20px_rgba(0,0,0,0.45)]"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* name and venue  */}
      <div className="text-center">
        <p className="text-[15px] font-semibold font-space capitalize text-heading truncate">
          {data?.tournament_name}
        </p>
        <p className="text-subheading text-[13px] mt-0.5 flex items-center justify-center gap-1 truncate">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{data?.venue}</span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2.5">
          <TeamChip name={data?.teamA} size="lg" />
          <span className="text-heading font-bold text-xl">{data?.teamA}</span>
        </div>
        <span className="h-8 w-8 rounded-full bg-secondary ring-1 ring-black/5 dark:ring-white/10 grid place-items-center">
          <Zap className="text-emerald-500" size={15} strokeWidth={1.75} />
        </span>
        <div className="flex items-center gap-2.5">
          <TeamChip name={data?.teamB} size="lg" />
          <span className="text-heading font-bold text-xl">{data?.teamB}</span>
        </div>
      </div>

      <div className="flex flex-row justify-between text-xs font-semibold text-secondary capitalize mt-auto">
        <span className="flex items-center gap-1.5">
          <Calendar size={13} />
          {data?.match_date ? new Date(data.match_date).toDateString() : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={13} />
          {data?.match_time}
        </span>
      </div>
    </div>
  );
};

export default UpcomingCard;
