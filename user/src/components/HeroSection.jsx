import { Link } from "react-router-dom";
import { getScorerId } from "../lib/api";

const HeroSection = () => {
  return (
    <div className="px-4 py-6">
      <div className="text-center text-heading font-space">
        <p className="text-2xl">
          Bring your Local Cricket Tournament Online with
        </p>
        <p className="text-5xl md:text-7xl mt-8 font-black heading-gradient drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]">
          CricScore
        </p>
        <p className="text-base mt-8 font-inter text-subheading">
          Say goodbye to paper scoring and messy updates.
          <br /> CricScore makes it easy to score, manage, <br />
          and share live match updates with your audience in real time.
        </p>

        {/* cta button  */}
        <Link
          to={getScorerId() ? "/score" : "/login"}
          className="inline-block text-black mt-10 w-fit md:w-60 p-3 rounded-xl text-lg font-bold bg-gradient-to-r from-[#10b981] to-[#a3e635] cursor-pointer hover:drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-300"
        >
          Start Scoring
        </Link>
      </div>
    </div>
  );
};

export default HeroSection;
