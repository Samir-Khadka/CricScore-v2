import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import {
  findInnings,
  inningsView,
  matchFormat,
  teamColorHex,
} from "../lib/cricket";
import TeamChip from "./TeamChip";
import LiveDot from "./LiveDot";
import TimelineItem from "./TimelineItem";

const LiveCard = ({ data }) => {
  const teamAinn = findInnings(data, data?.teamA_id);
  const teamBinn = findInnings(data, data?.teamB_id);
  const format = matchFormat(data);

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
      <span className="text-subheading text-sm font-inter">Yet to bat</span>
    );

  const currentInn =
    data?.inning_in_progress === 2 ? teamBinn || teamAinn : teamAinn;
  const currentView = inningsView(currentInn, null);
  const thisOver = currentView?.thisOver || [];
  const battingName =
    data?.inning_in_progress === 2 ? data?.teamB : data?.teamA;
  const progressPct =
    format && currentView
      ? Math.min(
          100,
          Math.round((currentView.legalBalls / (format * 6)) * 100)
        )
      : null;

  const teamRow = (name, inn) => (
    <div
      className={`flex justify-between items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 ${
        name === battingName ? "bg-emerald-500/[0.06]" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <TeamChip name={name} size="md" />
        <span className="text-heading font-condensed font-bold uppercase tracking-wide text-[19px] truncate">
          {name}
        </span>
        {name === battingName && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        )}
      </div>
      <div className="font-display font-extrabold text-[28px] leading-none text-heading shrink-0">
        {scoreLine(inn)}
      </div>
    </div>
  );

  return (
    <Link
      to={data?._id ? `/match/${data._id}` : "#"}
      className="surface-card card-link live-glow block group w-full md:w-[340px] overflow-hidden"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: teamColorHex(battingName),
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

      <div className="p-4 flex flex-col gap-3.5">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-bold font-condensed uppercase tracking-wide text-heading truncate">
              {data?.tournament_name}
            </p>
            <p className="text-subheading text-[12.5px] mt-0.5 flex items-center gap-1 truncate">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{data?.venue}</span>
            </p>
          </div>
          <span className="live-badge shrink-0">
            <LiveDot />
            LIVE
          </span>
        </div>

        {/* teams + scores */}
        <div className="space-y-1.5">
          {teamRow(data?.teamA, teamAinn)}
          {teamRow(data?.teamB, teamBinn)}
        </div>

        {/* innings progress */}
        {progressPct !== null && (
          <div>
            <div
              className="progress-track"
              role="img"
              aria-label={`Innings progress: ${progressPct} percent of overs bowled`}
            >
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

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
        <div className="flex flex-row justify-between items-center gap-2 text-[12.5px] font-semibold text-subheading mt-auto">
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
    </Link>
  );
};

export default LiveCard;
