import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { findInnings, matchFormat } from "../lib/cricket";

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
      <>
        {inn.runs}/{inn.wickets}
        <span className="text-subheading text-sm font-semibold font-inter mx-2">
          ({inn.over}.{inn.balls}
          {format ? `/${format}` : ""})
        </span>
      </>
    ) : (
      <span className="text-subheading text-sm font-inter">Yet to bat</span>
    );

  const currentInn =
    data?.inning_in_progress === 2 ? teamBinn || teamAinn : teamAinn;

  return (
    <div
      className="bg-card w-full md:w-100 lg:w-72 h-72 flex flex-col justify-evenly rounded-lg shadow-md overflow-hidden cursor-pointer border-2 border-[#cc66ff]/40 hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(204,102,255,0.5)] transition-all duration-300 px-4"
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

      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="text-heading font-bold text-xl">{data?.teamA}</div>
          <div className="font-bold font-space text-xl text-heading">
            {scoreLine(teamAinn)}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-heading font-bold text-xl">{data?.teamB}</div>
          <div className="font-bold font-space text-xl text-heading">
            {scoreLine(teamBinn)}
          </div>
        </div>
        <div className="flex flex-row justify-between text-sm font-semibold text-subheading capitalize">
          <div>CRR: {currentInn?.current_run_rate ?? "—"}</div>
          <div>
            {data?.toss?.wonBy
              ? `${
                  data.toss.wonBy === data?.teamA_id ? data?.teamA : data?.teamB
                } chose to ${
                  data.toss.decision === "ball"
                    ? "field"
                    : data.toss.decision || ""
                }`
              : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveCard;
