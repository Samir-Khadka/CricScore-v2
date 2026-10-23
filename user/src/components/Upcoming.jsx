import { Calendar, Clock, MapPin, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { teamColorHex } from "../lib/cricket";
import { fmtDate } from "../lib/formStyles";
import TeamChip from "./TeamChip";
import { matchPrefetchProps } from "../lib/preload";

const UpcomingCard = ({ data }) => {
  return (
    <Link
      {...matchPrefetchProps(data?._id)}
      to={data?._id ? `/match/${data._id}` : "#"}
      className="surface-card card-link block w-full md:w-[340px] overflow-hidden"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: teamColorHex(data?.teamA),
      }}
    >
      {/* team colour bar — the two colours meet mid-card */}
      <div
        className="h-1"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(90deg, ${teamColorHex(data?.teamA)} 0%, ${teamColorHex(data?.teamA)} 42%, ${teamColorHex(data?.teamB)} 58%, ${teamColorHex(data?.teamB)} 100%)`,
        }}
      />

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
            <span className="text-heading font-condensed font-bold uppercase tracking-wide text-[24px] leading-none">
              {data?.teamA}
            </span>
          </div>
          <span className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 ring-2 ring-lime-300/40 shadow-[0_0_18px_rgba(163,230,53,0.4)] grid place-items-center">
            <Zap className="text-emerald-950" size={15} strokeWidth={2.25} />
          </span>
          <div className="flex items-center gap-2.5">
            <TeamChip name={data?.teamB} size="lg" />
            <span className="text-heading font-condensed font-bold uppercase tracking-wide text-[24px] leading-none">
              {data?.teamB}
            </span>
          </div>
        </div>

        <div className="flex flex-row justify-center gap-2 text-[11.5px] font-bold text-subheading capitalize mt-auto">
          <span className="flex items-center gap-1.5 bg-secondary/70 ring-1 ring-black/5 dark:ring-white/10 rounded-full px-3 py-1.5">
            <Calendar size={12} />
            {fmtDate(data?.match_date)}
          </span>
          <span className="flex items-center gap-1.5 bg-secondary/70 ring-1 ring-black/5 dark:ring-white/10 rounded-full px-3 py-1.5 tabular-nums">
            <Clock size={12} />
            {data?.match_time}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default UpcomingCard;
