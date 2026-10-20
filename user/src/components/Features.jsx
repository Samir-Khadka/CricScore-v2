import { Tally5, TrendingUp, Trophy } from "lucide-react";

const Features = () => {
  return (
    <div className="w-full flex flex-row flex-wrap md:flex-nowrap justify-between gap-6 mt-15">
      {/* feature 1 */}
      <div className="w-full max-w-[400px] bg-card p-5 rounded-xl flex flex-col items-center border-2 border-emerald-500/50 shadow-md hover:scale-105 transition-all duration-300 cursor-pointer hover:drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
        <Tally5 className="text-emerald-400" size={40} />
        <p className="text-xl font-bold mt-2 text-heading">
          Cricket Scoring Made Simple
        </p>
        <p className="mt-2 text-sm text-subheading text-justify">
          No more paper scorecards — score every ball with just a tap. CricScore
          is built for local scorers, making match updates quick and error-free.
        </p>
      </div>

      {/* feature 2 */}
      <div className="w-full max-w-[400px] bg-card p-5 rounded-xl flex flex-col items-center border-2 border-rose-500/50 shadow-md hover:scale-105 transition-all duration-300 cursor-pointer hover:drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]">
        <TrendingUp className="text-rose-500" size={40} />
        <p className="text-xl font-bold mt-2 text-heading">
          Real-Time Score Updates
        </p>
        <p className="mt-2 text-sm text-subheading text-justify">
          Players, fans, and organizers can follow matches in real time from
          anywhere. Share your tournament's excitement beyond the boundary.
        </p>
      </div>

      {/* feature 3 */}
      <div className="w-full max-w-[400px] bg-card p-5 rounded-xl flex flex-col items-center border-2 border-fuchsia-500/50 shadow-md hover:scale-105 transition-all duration-300 cursor-pointer hover:drop-shadow-[0_0_12px_rgba(217,70,239,0.5)]">
        <Trophy className="text-fuchsia-500" size={40} />
        <p className="text-xl font-bold mt-2 text-heading">
          All-in-One Tournament Hub
        </p>
        <p className="mt-2 text-sm text-subheading text-justify">
          Fixtures, standings, stats, and scoreboards — everything your local
          tournament needs, all organized in one place.
        </p>
      </div>
    </div>
  );
};

export default Features;
