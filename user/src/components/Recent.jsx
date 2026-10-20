import { Calendar, Clock, MapPin, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { findInnings, matchFormat, teamColorHex } from "../lib/cricket";
import TeamChip from "./TeamChip";

const Recent = ({ data }) => {
  const navigate = useNavigate();
  const teamAInning = findInnings(data, data?.teamA_id);
  const teamBInning = findInnings(data, data?.teamB_id);
  const format = matchFormat(data);

  const handleClick = () => {
    if (data?._id) navigate(`/match/${data._id}`);
  };

  const winnerName =
    data?.winner === data?.teamA_id
      ? data?.teamA
      : data?.winner === data?.teamB_id
        ? data?.teamB
        : data?.teamA;

  const scoreLine = (inn) =>
    inn ? (
      <span className="tabular-nums">
        {inn.runs}/{inn.wickets}
        <span className="text-subheading text-[12px] font-semibold font-inter ml-1.5">
          ({inn.over}.{inn.balls}
          {format ? `/${format}` : ""})
        </span>
      </span>
    ) : (
      <span className="text-subheading text-sm font-inter">—</span>
    );

  const teamRow = (name, inn) => (
    <div className="flex justify-between items-center gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <TeamChip name={name} size="md" />
        <span className="text-heading font-semibold text-[16px] truncate">
          {name}
        </span>
      </div>
      <div className="font-condensed font-bold text-[26px] leading-none text-heading shrink-0">
        {scoreLine(inn)}
      </div>
    </div>
  );

  return (
    <div
      className="surface-card w-full md:w-[340px] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-20px_rgba(0,0,0,0.45)]"
      style={{ borderLeftWidth: 3, borderLeftColor: teamColorHex(winnerName) }}
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

      <div className="p-4 flex flex-col gap-3.5">
        <div>
          <p className="text-[14px] font-bold font-condensed uppercase tracking-wide text-heading truncate">
            {data?.tournament_name}
          </p>
          <p className="text-subheading text-[12.5px] mt-0.5 flex items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{data?.venue}</span>
          </p>
        </div>

        <div className="space-y-3">
          {teamRow(data?.teamA, teamAInning)}
          {teamRow(data?.teamB, teamBInning)}
        </div>

        {data?.result && (
          <div className="flex items-center gap-2 bg-emerald-500/10 ring-1 ring-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold text-[12.5px] rounded-xl px-3 py-2">
            <Trophy size={14} className="shrink-0" />
            <span className="truncate">{data.result}</span>
          </div>
        )}

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

export default Recent;
