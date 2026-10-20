import { Tally5, TrendingUp, Trophy } from "lucide-react";

const FEATURES = [
  {
    icon: Tally5,
    chip: "bg-emerald-500/12 text-emerald-500 ring-emerald-500/25",
    title: "Cricket Scoring Made Simple",
    text: "No more paper scorecards — score every ball with just a tap. CricScore is built for local scorers, making match updates quick and error-free.",
  },
  {
    icon: TrendingUp,
    chip: "bg-rose-500/12 text-rose-500 ring-rose-500/25",
    title: "Real-Time Score Updates",
    text: "Players, fans, and organizers can follow matches in real time from anywhere. Share your tournament's excitement beyond the boundary.",
  },
  {
    icon: Trophy,
    chip: "bg-amber-500/12 text-amber-500 ring-amber-500/25",
    title: "All-in-One Tournament Hub",
    text: "Fixtures, standings, stats, and scoreboards — everything your local tournament needs, all organized in one place.",
  },
];

const Features = () => {
  return (
    <div className="w-full flex flex-row flex-wrap md:flex-nowrap justify-between gap-6 mt-15">
      {FEATURES.map((f) => {
        const Icon = f.icon;
        return (
          <div
            key={f.title}
            className="surface-card w-full max-w-[400px] p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1"
          >
            <span
              className={`h-14 w-14 rounded-2xl ring-1 grid place-items-center ${f.chip}`}
            >
              <Icon size={26} />
            </span>
            <p className="text-lg font-bold mt-4 text-heading">{f.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-subheading">
              {f.text}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default Features;
