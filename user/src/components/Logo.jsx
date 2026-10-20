/**
 * CricScore brand mark: an emerald cricket ball with stitched seams.
 * `LogoMark` is the icon alone; `Logo` pairs it with the wordmark.
 */
export const LogoMark = ({ size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    role="img"
    aria-label="CricScore logo"
    className="shrink-0 drop-shadow-[0_6px_16px_rgba(16,185,129,0.35)]"
  >
    <defs>
      <linearGradient
        id="cricscore-ball"
        x1="6"
        y1="4"
        x2="42"
        y2="44"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#34d399" />
        <stop offset="0.55" stopColor="#10b981" />
        <stop offset="1" stopColor="#84cc16" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="21" fill="url(#cricscore-ball)" />
    <circle
      cx="24"
      cy="24"
      r="21"
      fill="none"
      stroke="#064e3b"
      strokeOpacity="0.35"
      strokeWidth="1.5"
    />
    <path
      d="M16.8 4.2c-4.6 6-4.6 13.6 0 19.8 4.6 6.2 4.6 13.8 0 19.8"
      fill="none"
      stroke="#ecfdf5"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeDasharray="3.4 2.9"
      opacity="0.95"
    />
    <path
      d="M31.2 4.2c4.6 6 4.6 13.6 0 19.8-4.6 6.2-4.6 13.8 0 19.8"
      fill="none"
      stroke="#ecfdf5"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeDasharray="3.4 2.9"
      opacity="0.95"
    />
  </svg>
);

const Logo = ({ size = 36, wordmarkClass = "text-[22px]" }) => (
  <span className="inline-flex items-center gap-2.5">
    <LogoMark size={size} />
    <span
      className={`${wordmarkClass} leading-none font-space font-bold tracking-tight text-heading`}
    >
      Cric<span className="text-emerald-500">Score</span>
    </span>
  </span>
);

export default Logo;
