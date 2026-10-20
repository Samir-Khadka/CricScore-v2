import { Calendar, Clock, MapPin, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { findInnings, matchFormat } from "../lib/cricket";
import TeamChip from "./TeamChip";

const Recent = ({ data }) => {
  const navigate = useNavigate();
  const teamAInning = findInnings(data, data?.teamA_id);
  const teamBInning = findInnings(data, data?.teamB_id);
  const format = matchFormat(data);

  const handleClick = () => {
    if (data?._id) navigate(`/match/${data._id}`);
  };

  const scoreLine = (inn) =>
    inn ? (
      <span className="tabular-nums">
        {inn.runs}/{inn.wickets}
        <span className="text-subheading text-[13px] font-semibold font-inter ml-1.5">
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
        <span className="text-heading font-semibold text-[17px] truncate">
          {name}
        </span>
      </div>
      <div className="font-bold font-space text-xl text-heading shrink-0">
        {scoreLine(inn)}
      </div>
    </div>
  );

  return (
    <div
      className="surface-card w-full md:w-[340px] p-5 flex flex-col gap-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-20px_rgba(0,0,0,0.45)]"
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
      <div>
        <p className="text-[15px] font-semibold font-space capitalize text-heading truncate">
          {data?.tournament_name}
        </p>
        <p className="text-subheading text-[13px] mt-0.5 flex items-center gap-1 truncate">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{data?.venue}</span>
        </p>
      </div>

      <div className="space-y-3.5">
        {teamRow(data?.teamA, teamAInning)}
        {teamRow(data?.teamB, teamBInning)}
      </div>

      {data?.result && (
        <div className="flex items-center gap-2 bg-emerald-500/10 ring-1 ring-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold text-[13px] rounded-xl px-3 py-2.5">
          <Trophy size={15} className="shrink-0" />
          <span className="truncate">{data.result}</span>
        </div>
      )}

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

export default Recent;
