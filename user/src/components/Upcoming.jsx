import { Calendar, Clock, MapPin, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { teamColorHex } from "../lib/cricket";
import TeamChip from "./TeamChip";

const UpcomingCard = ({ data }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (data?._id) navigate(`/match/${data._id}`);
  };
  return (
    <div
      className="surface-card w-full md:w-[340px] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-20px_rgba(0,0,0,0.45)]"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: teamColorHex(data?.teamA),
      }}
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
      {/* team colour bar */}
      <div className="flex h-1" aria-hidden="true">
        <div
          className="flex-1"
          style={{ backgroundColor: teamColorHex(data?.teamA) }}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: teamColorHex(data?.teamB) }}
        />
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* name and venue  */}
        <div className="text-center">
          <p className="text-[14px] font-bold font-condensed uppercase tracking-wide text-heading truncate">
            {data?.tournament_name}
          </p>
          <p className="text-subheading text-[12.5px] mt-0.5 flex items-center justify-center gap-1 truncate">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{data?.venue}</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <TeamChip name={data?.teamA} size="lg" />
            <span className="text-heading font-condensed font-semibold text-[22px] tracking-wide">
              {data?.teamA}
            </span>
          </div>
          <span className="h-7 w-7 rounded-full bg-secondary ring-1 ring-black/5 dark:ring-white/10 grid place-items-center">
            <Zap className="text-emerald-500" size={13} strokeWidth={1.75} />
          </span>
          <div className="flex items-center gap-2.5">
            <TeamChip name={data?.teamB} size="lg" />
            <span className="text-heading font-condensed font-semibold text-[22px] tracking-wide">
              {data?.teamB}
            </span>
          </div>
        </div>

        <div className="flex flex-row justify-between text-[11.5px] font-semibold text-secondary capitalize mt-auto">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} />
            {data?.match_date ? new Date(data.match_date).toDateString() : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            {data?.match_time}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UpcomingCard;
