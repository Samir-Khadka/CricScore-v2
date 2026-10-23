import { memo } from "react";
const PlayerScoreCard = (props) => {
  return (
    <div className="bg-secondary/60 ring-1 ring-black/5 dark:ring-white/10 md:w-[120px] lg:w-[180px] xl:w-[250px] p-3.5 flex flex-col justify-evenly rounded-xl overflow-hidden">
      <div className="flex xl:flex-row flex-col">
        <p className="xl:w-[60%] lg:truncate xl:text-left text-center text-sm text-heading font-semibold">
          {props.name}
          {props.onStrike ? " *" : ""}
        </p>
        <p className="xl:w-[40%] text-heading text-center font-bold font-space tabular-nums">
          {props.score}
        </p>
      </div>
      {/* players stats  */}
      <div className="text-subheading text-[13px] font-semibold text-center mt-2">
        {props.isBatsmen === true ? (
          <ul className="flex flex-col xl:flex-row justify-evenly gap-y-1.5 tabular-nums">
            <li>{props.fours} fours</li>
            <li>{props.sixes} sixes</li>
            <li>SR: {props.sr}</li>
          </ul>
        ) : (
          <ul className="flex flex-col xl:flex-row justify-evenly gap-y-1.5 tabular-nums">
            <li>{props.overs} ov</li>
            <li className="xl:list-disc">{props.maiden} m</li>
            <li className="xl:list-disc">Econ: {props.econ}</li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default memo(PlayerScoreCard);
