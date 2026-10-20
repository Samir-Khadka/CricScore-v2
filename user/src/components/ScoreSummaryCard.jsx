import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { findInnings, inningsView, matchFormat } from "../lib/cricket";
import TeamChip from "./TeamChip";
import LiveDot from "./LiveDot";
import TimelineItem from "./TimelineItem";

const LiveCard = ({ data }) => {
  const navigate = useNavigate();
  const teamAinn = findInnings(data, data?.teamA_id);
  const teamBinn = findInnings(data, data?.teamB_id);
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
      <span className="text-subheading text-sm font-inter">Yet to bat</span>
    );

  const currentInn =
    data?.inning_in_progress === 2 ? teamBinn || teamAinn : teamAinn;
  const thisOver = inningsView(currentInn, null)?.thisOver || [];

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
      className="surface-card group w-full md:w-[340px] p-5 flex flex-col gap-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-20px_rgba(0,0,0,0.45)]"
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
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold font-space capitalize text-heading truncate">
            {data?.tournament_name}
          </p>
          <p className="text-subheading text-[13px] mt-0.5 flex items-center gap-1 truncate">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{data?.venue}</span>
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-rose-500 text-[11px] font-black tracking-[0.14em] shrink-0 pt-1">
          <LiveDot />
          LIVE
        </span>
      </div>

      {/* teams + scores */}
      <div className="space-y-3.5">
        {teamRow(data?.teamA, teamAinn)}
        {teamRow(data?.teamB, teamBinn)}
      </div>

      {/* this over */}
      {thisOver.length > 0 && (
        <div className="flex items-center flex-wrap gap-y-1 border-t card-border pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary mr-1.5">
            This over
          </span>
          {thisOver.map((s, i) => (
            <TimelineItem key={i} result={s} />
          ))}
        </div>
      )}

      {/* meta */}
      <div className="flex flex-row justify-between items-center gap-2 text-[13px] font-semibold text-subheading mt-auto">
        <span className="tabular-nums">
          CRR{" "}
          <span className="text-heading font-space">
            {currentInn?.current_run_rate ?? "—"}
          </span>
        </span>
        {data?.toss?.wonBy && (
          <span className="capitalize text-right truncate">
            {data.toss.wonBy === data?.teamA_id ? data?.teamA : data?.teamB}{" "}
            chose to{" "}
            {data.toss.decision === "ball"
              ? "field"
              : data.toss.decision || ""}
          </span>
        )}
      </div>
    </div>
  );
};

export default LiveCard;
