import { teamColorClass, teamInitials } from "../lib/cricket";

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

/**
 * Team monogram: initials in a coloured circle. The colour is derived
 * deterministically from the team name, so a team looks the same
 * everywhere in the app.
 */
const TeamChip = ({ name, size = "md" }) => (
  <span
    aria-hidden="true"
    className={`${
      SIZES[size] || SIZES.md
    } ${teamColorClass(
      name
    )} rounded-full text-white font-space font-bold inline-flex items-center justify-center shrink-0 ring-1 ring-white/25 shadow-sm select-none`}
  >
    {teamInitials(name)}
  </span>
);

export default TeamChip;
