const PlayerScoreCard = (props) => {
  return (
    <div className=" bg-secondary md:w-[120px] lg:w-[180px] xl:w-[250px] p-3 flex flex-col justify-evenly rounded-lg shadow-md overflow-hidden">
      <div className="flex xl:flex-row flex-col">
        <p className="xl:w-[60%] lg:truncate xl:text-left text-center text-sm text-heading font-semibold">
          {props.name}
          {props.onStrike ? " *" : ""}
        </p>
        <p className="xl:w-[40%] text-heading text-center font-bold font-space">
          {props.score}
        </p>
      </div>
      {/* players stats  */}
      <div className="text-subheading text-sm font-semibold text-center mt-2">
        {props.isBatsmen === true ? (
          <ul className="flex flex-col xl:flex-row justify-evenly gap-y-2">
            <li>{props.fours} fours</li>
            <li className="">{props.sixes} sixes</li>
            <li className="">SR: {props.sr}</li>
          </ul>
        ) : (
          <ul className="flex flex-col xl:flex-row justify-evenly gap-y-2">
            <li>{props.overs} ov</li>
            <li className="xl:list-disc">{props.maiden} m</li>
            <li className="xl:list-disc">Econ: {props.econ}</li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default PlayerScoreCard;
