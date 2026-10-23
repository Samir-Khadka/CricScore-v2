import { shadeHex, teamColorClass, teamColorHex, teamInitials } from "../lib/cricket";

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
  xl: "h-14 w-14 text-base",
};

/**
 * Team monogram: initials on a diagonal gradient of the team's colour.
 * The colour is derived deterministically from the team name, so a team
 * looks the same everywhere in the app.
 */
const TeamChip = ({ name, size = "md" }) => {
  const hex = teamColorHex(name);
  return (
    <span
      aria-hidden="true"
      className={`${
        SIZES[size] || SIZES.md
      } ${teamColorClass(
        name
      )} rounded-full text-white font-display font-extrabold inline-flex items-center justify-center shrink-0 ring-1 ring-white/30 select-none`}
      style={{
        backgroundColor: hex,
        backgroundImage: `linear-gradient(135deg, ${shadeHex(hex, 16)}, ${hex} 55%, ${shadeHex(hex, -24)})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px -6px ${hex}73`,
        textShadow: "0 1px 2px rgba(0,0,0,0.35)",
      }}
    >
      {teamInitials(name)}
    </span>
  );
};

export default TeamChip;
