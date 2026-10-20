import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ClockFading, MoveRight, Trophy } from "lucide-react";
import Tournaments from "../components/TournamentsCard";
import HeroSection from "../components/HeroSection";
import Features from "../components/Features";
import LiveCard from "../components/ScoreSummaryCard";
import LiveDot from "../components/LiveDot";
import UpcomingCard from "../components/Upcoming";
import Recent from "../components/Recent";
import { ErrorBox, SkeletonCard } from "../components/States";
import { api, homeSocket, unwrap } from "../lib/api";

function SectionHeader({ icon, title, subtitle, onViewAll }) {
  return (
    <div className="flex flex-row justify-between items-start gap-2">
      <div className="text-2xl text-heading font-space font-semibold tracking-wide">
        {icon}
        <span>{title}</span>
        <p className="text-sm text-subheading ml-8 mt-1 font-normal font-inter">
          {subtitle}
        </p>
      </div>
      {onViewAll && (
        <button
          type="button"
          className="text-sm font-semibold text-secondary cursor-pointer p-2 rounded-xl hover:text-[#10b981] transition-all shrink-0"
          onClick={onViewAll}
        >
          View All <MoveRight className="inline-block" size={16} />
        </button>
      )}
    </div>
  );
}

function MatchGrid({ loading, error, onRetry, items, render, emptyText }) {
  if (loading) {
    return (
      <div className="flex flex-row flex-wrap gap-6 justify-evenly items-center mt-5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  if (!items || items.length === 0) {
    return <p className="text-subheading mt-5 px-2">{emptyText}</p>;
  }
  return (
    <div className="flex flex-row flex-wrap gap-6 justify-evenly items-center mt-5">
      {items.map(render)}
    </div>
  );
}

const Home = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState({
    live: true,
    upcoming: true,
    recent: true,
    tournaments: true,
  });
  const [errors, setErrors] = useState({});

  const load = useCallback(async (key, path, setter, signal) => {
    setLoading((l) => ({ ...l, [key]: true }));
    setErrors((e) => ({ ...e, [key]: null }));
    try {
      const res = await api.get(path, { signal });
      setter(unwrap(res) || []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setErrors((e) => ({ ...e, [key]: err.message }));
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }, []);

  const loadAll = useCallback(
    (signal) => {
      load("tournaments", "/view/tournaments", setTournaments, signal);
      load("live", "/view/matches?state=live", setLiveMatches, signal);
      load("upcoming", "/view/matches?state=upcoming", setUpcomingMatches, signal);
      load("recent", "/view/matches?state=completed", setRecentMatches, signal);
    },
    [load]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    loadAll(ctrl.signal);
    return () => ctrl.abort();
  }, [loadAll]);

  // Live list stays fresh over the home socket room.
  useEffect(() => {
    const socket = homeSocket();
    socket.on("liveMatches", (matches) => {
      if (Array.isArray(matches)) {
        setLiveMatches(matches);
        setLoading((l) => ({ ...l, live: false }));
      }
    });
    return () => {
      socket.off("liveMatches");
      socket.disconnect();
    };
  }, []);

  const handleViewAll = (type) => navigate(`/matches/${type}`);

  return (
    <section className="px-4 md:px-10 py-6 min-h-screen max-w-[1400px] mx-auto">
      {/* Live Matches */}
      <div className="mt-6">
        <SectionHeader
          icon={<LiveDot className="mr-2.5 -translate-y-0.5" />}
          title="Live Matches"
          subtitle="Happening now in CricScore."
          onViewAll={() => handleViewAll("live")}
        />
        <MatchGrid
          loading={loading.live}
          error={errors.live}
          onRetry={() => load("live", "/view/matches?state=live", setLiveMatches)}
          items={liveMatches.slice(0, 4)}
          emptyText="No live matches right now."
          render={(match) => <LiveCard data={match} key={match._id} />}
        />
      </div>

      {/* hero section  */}
      <div className="mt-16">
        <HeroSection />
      </div>

      {/* upcoming */}
      <div className="mt-16">
        <SectionHeader
          icon={
            <Calendar size={20} className="inline-block mr-2 text-amber-300/70 align-middle" />
          }
          title="Upcoming Matches"
          subtitle="Don't miss the exciting cricketing action ahead."
          onViewAll={() => handleViewAll("upcoming")}
        />
        <MatchGrid
          loading={loading.upcoming}
          error={errors.upcoming}
          onRetry={() =>
            load("upcoming", "/view/matches?state=upcoming", setUpcomingMatches)
          }
          items={upcomingMatches.slice(0, 4)}
          emptyText="No upcoming matches scheduled."
          render={(match) => <UpcomingCard data={match} key={match._id} />}
        />
      </div>

      {/* features  */}
      <div className="mt-16">
        <p className="text-3xl font-space text-center text-heading font-bold tracking-wide">
          Powerful Features
        </p>
        <p className="text-sm text-center text-subheading font-normal mt-1 font-inter">
          Your Local Cricket Tournament. Digitized.
        </p>
        <Features />
      </div>

      {/* recently completed */}
      <div className="mt-16">
        <SectionHeader
          icon={
            <ClockFading size={20} className="inline-block mr-2 text-cyan-300 align-middle" />
          }
          title="Recently Concluded"
          subtitle="Have a look at the recent thrillers."
          onViewAll={() => handleViewAll("recent")}
        />
        <MatchGrid
          loading={loading.recent}
          error={errors.recent}
          onRetry={() =>
            load("recent", "/view/matches?state=completed", setRecentMatches)
          }
          items={recentMatches.slice(0, 4)}
          emptyText="No completed matches yet."
          render={(match) => <Recent data={match} key={match._id} />}
        />
      </div>

      {/* Tournaments */}
      <div className="mt-16">
        <SectionHeader
          icon={
            <Trophy size={20} className="inline-block mr-2 text-[#10b981] align-middle" />
          }
          title="Tournaments"
          subtitle="Follow your favorite."
          onViewAll={() => navigate("/tournaments")}
        />
        <MatchGrid
          loading={loading.tournaments}
          error={errors.tournaments}
          onRetry={() => load("tournaments", "/view/tournaments", setTournaments)}
          items={tournaments}
          emptyText="No tournaments found."
          render={(t) => (
            <Tournaments name={t.tournament_name} key={t._id} tour={tournaments} />
          )}
        />
      </div>
    </section>
  );
};

export default Home;
