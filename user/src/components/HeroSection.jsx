import { Link } from "react-router-dom";
import { ArrowRight, TableProperties, TrendingUp, Zap } from "lucide-react";
import { getScorerId } from "../lib/api";
import FeaturedMatch, { FeaturedMatchMock } from "./FeaturedMatch";

const CAPABILITIES = [
  {
    icon: Zap,
    title: "Ball-by-ball engine",
    caption: "Every delivery, scored & synced live",
  },
  {
    icon: TrendingUp,
    title: "Win predictor",
    caption: "Live win % on every chase",
  },
  {
    icon: TableProperties,
    title: "NRR points tables",
    caption: "Standings that update themselves",
  },
];

/**
 * Homepage hero: broadcast headline + CTAs on the left, the featured
 * match panel (live if possible, else latest result, else a preview
 * visual) on the right.
 * Props: { featuredMatch, featuredDetail, featuredVariant }
 */
const HeroSection = ({ featuredMatch, featuredDetail, featuredVariant }) => {
  return (
    <div className="relative">
      {/* ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-32 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl animate-drift"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-20 right-0 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl"
      />

      <div className="relative grid lg:grid-cols-[1.02fr_0.98fr] gap-10 lg:gap-12 items-center py-8 lg:py-12">
        {/* copy */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live scoring platform
          </span>

          <h1 className="mt-5 font-condensed font-bold uppercase leading-[0.92] tracking-tight text-heading text-[56px] sm:text-7xl xl:text-[92px]">
            Local cricket.
            <span className="block heading-gradient drop-shadow-[0_0_24px_rgba(16,185,129,0.25)]">
              Broadcast live.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg leading-relaxed text-subheading font-inter max-w-xl">
            CricScore turns any ground into a broadcast — ball-by-ball
            scoring, live win probability and tournament standings your
            whole community can follow in real time. No paper, no chaos.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to={getScorerId() ? "/score" : "/login"}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-slate-950 rounded-full text-base font-bold bg-gradient-to-r from-emerald-500 to-lime-400 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-px active:translate-y-0 transition-all duration-300"
            >
              Start Scoring
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/matches/live"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-base font-bold text-heading bg-card ring-1 card-border hover:ring-emerald-500/50 transition-all duration-300"
            >
              View Matches
            </Link>
          </div>

          {/* capability stats — what the product does, not vanity numbers */}
          <div className="mt-9 pt-6 border-t card-border flex flex-wrap gap-x-9 gap-y-5">
            {CAPABILITIES.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="min-w-[140px]">
                  <p className="flex items-center gap-2 font-condensed font-semibold text-[19px] tracking-wide text-heading">
                    <Icon size={17} className="text-emerald-500" />
                    {c.title}
                  </p>
                  <p className="text-[12.5px] text-secondary mt-1 font-inter">
                    {c.caption}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* featured match */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-emerald-500/15 via-transparent to-lime-400/10 blur-xl"
          />
          <div className="relative">
            {featuredMatch ? (
              <FeaturedMatch
                match={featuredMatch}
                detail={featuredDetail}
                variant={featuredVariant}
              />
            ) : (
              <FeaturedMatchMock />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
