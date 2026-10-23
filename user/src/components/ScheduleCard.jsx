import { fmtDate } from "../lib/formStyles";

const ScheduleCard = (props) => {
  return (
    <div className="w-full max-w-4xl surface-card p-2 flex flex-row justify-evenly items-center text-heading">
      <div className="w-[25%] border-r-2 border-secondary px-2 text-center text-sm">
        {fmtDate(props.date)}
        <br />
        {props.time}
      </div>
      <div className="w-[50%] px-2 text-center font-semibold">
        {props.teamA} vs. {props.teamB}
      </div>
      <div className="w-[25%] border-l-2 border-secondary px-2 text-center text-sm">
        {props.venue}
      </div>
    </div>
  );
};

export default ScheduleCard;
