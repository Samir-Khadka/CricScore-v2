import { Radio, Trophy, Users } from "lucide-react";

const STEPS = [
  {
    icon: Trophy,
    step: "01",
    title: "Create your tournament",
    text: "Set the format, venue and dates in under a minute. Fixtures generate themselves.",
  },
  {
    icon: Users,
    step: "02",
    title: "Add teams & squads",
    text: "Register your clubs and playing elevens — every player gets a tournament profile.",
  },
  {
    icon: Radio,
    step: "03",
    title: "Score ball-by-ball",
    text: "One tap per delivery from the boundary. Fans follow every ball live, from anywhere.",
  },
];

/** Three-step strip for organisers: idea → live broadcast. */
const HowItWorks = () => {
  return (
    <div className="relative grid gap-4 md:grid-cols-3 mt-8">
      {/* connector line (desktop) */}
      <div
        aria-hidden="true"
        className="hidden md:block absolute top-[52px] left-[18%] right-[18%] border-t-2 border-dashed border-secondary"
      />
      {STEPS.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.step}
            className="surface-card relative p-5 sm:p-6 text-center md:text-left flex flex-col items-center md:items-start"
          >
            <div className="relative">
              <span className="h-[68px] w-[68px] rounded-3xl bg-emerald-500/10 ring-1 ring-emerald-500/25 grid place-items-center text-emerald-500">
                <Icon size={28} />
              </span>
              <span className="absolute -top-2 -right-3 font-condensed font-bold text-[15px] bg-emerald-500 text-white rounded-full px-2 py-0.5 shadow-md shadow-emerald-500/40">
                {s.step}
              </span>
            </div>
            <p className="mt-4 font-condensed font-semibold text-[22px] tracking-wide text-heading">
              {s.title}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-subheading">
              {s.text}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default HowItWorks;
