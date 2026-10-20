import { ballChipClass } from "../lib/cricket";

const TimelineItem = ({ result }) => {
  return (
    <p
      className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-md m-1 text-sm font-bold border ${ballChipClass(
        result
      )}`}
    >
      {result}
    </p>
  );
};

export default TimelineItem;
