import { ballChipClass } from "../lib/cricket";

const TimelineItem = ({ result }) => {
  return (
    <p
      className={`min-w-8 h-8 px-1.5 m-0.5 inline-flex items-center justify-center rounded-full text-xs font-bold font-space tabular-nums border shadow-sm ${ballChipClass(
        result
      )}`}
    >
      {result}
    </p>
  );
};

export default TimelineItem;
