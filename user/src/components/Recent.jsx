import { Calendar, Clock, MapPin, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { findInnings, matchFormat, teamColorHex } from "../lib/cricket";
import { fmtDate } from "../lib/formStyles";
import TeamChip from "./TeamChip";

const Recent = ({ data }) => {
  const teamAInning = findInnings(data, data?.teamA_id);
  const teamBInning = findInnings(data, data?.teamB_id);
  const format = matchFormat(data);

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

  const teamRow = (name, inn) => {
    const isWinner = data?.winner && name === winnerName;
    return (
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <TeamChip name={name} size="md" />
          <span
            className={`font-condensed font-bold uppercase tracking-wide text-[19px] truncate ${
              isWinner ? "text-heading" : "text-subheading"
            }`}
          >
            {name}
          </span>
          {isWinner && (
            <Trophy size={14} className="text-amber-500 shrink-0" aria-hidden="true" />
          )}
        </div>
        <div
          className={`font-display font-extrabold text-[28px] leading-none shrink-0 ${
            isWinner
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-subheading"
          }`}
        >
          {scoreLine(inn)}
        </div>
      </div>
    );
  };

  return (
    <Link
      to={data?._id ? `/match/${data._id}` : "#"}
      className="surface-card card-link block w-full md:w-[340px] overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: teamColorHex(winnerName) }}
    >
      {/* team colour bar — the two colours meet mid-card */}
      <div
        className="h-1"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(90deg, ${teamColorHex(data?.teamA)} 0%, ${teamColorHex(data?.teamA)} 42%, ${teamColorHex(data?.teamB)} 58%, ${teamColorHex(data?.teamB)} 100%)`,
        }}
      />

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

        <div className="space-y-2.5">
          {teamRow(data?.teamA, teamAInning)}
          {teamRow(data?.teamB, teamBInning)}
        </div>

        {data?.result && (
          <p className="heading-gradient font-condensed italic font-bold uppercase tracking-wide text-[19px] leading-snug border-t card-border pt-3">
            {data.result}
          </p>
        )}

        <div className="flex flex-row justify-between text-[11.5px] font-semibold text-secondary capitalize mt-auto">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} />
            {fmtDate(data?.match_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            {data?.match_time}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Recent;
