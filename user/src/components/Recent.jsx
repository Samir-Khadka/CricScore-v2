import { Calendar, Clock, MapPin, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { findInnings, matchFormat } from "../lib/cricket";

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
      <>
        {inn.runs}/{inn.wickets}
        <span className="text-subheading text-sm font-semibold font-inter mx-2">
          ({inn.over}.{inn.balls}
          {format ? `/${format}` : ""})
        </span>
      </>
    ) : (
      <span className="text-subheading text-sm font-inter">—</span>
    );

  return (
    <div
      className="bg-card w-full md:w-100 lg:w-72 h-72 flex flex-col justify-evenly rounded-lg shadow-md overflow-hidden cursor-pointer border-2 border-cyan-500/50 hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(103,232,249,0.5)] transition-all duration-300 px-4"
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
        <p className="text-lg font-semibold font-space capitalize text-heading">
          {data?.tournament_name}
        </p>
        <MapPin size={16} className="inline text-subheading" />{" "}
        <span className="text-subheading text-sm font-normal mt-2">
          {data?.venue}
        </span>
      </div>

      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <div className="text-heading font-bold text-xl">{data?.teamA}</div>
          <div className="font-bold font-space text-xl text-heading">
            {scoreLine(teamAInning)}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-heading font-bold text-xl">{data?.teamB}</div>
          <div className="font-bold font-space text-xl text-heading">
            {scoreLine(teamBInning)}
          </div>
        </div>

        <div className="bg-emerald-400/20 text-heading font-medium text-sm rounded-lg p-3">
          <Trophy className="inline" size={18} strokeWidth={2.5} /> &nbsp;
          <span>{data?.result}</span>
        </div>

        <div className="flex flex-row justify-between text-xs font-semibold text-secondary capitalize">
          <div>
            <Calendar size={15} className="inline" /> &nbsp;
            <span>
              {data?.match_date
                ? new Date(data.match_date).toDateString()
                : ""}
            </span>
          </div>
          <div>
            <Clock size={16} className="inline" /> &nbsp;
            <span>{data?.match_time}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recent;
