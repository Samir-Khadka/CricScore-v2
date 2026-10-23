import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  ClockFading,
  MoveRight,
  Sparkles,
  Trophy,
} from "lucide-react";
import Tournaments from "../components/TournamentsCard";
import HeroSection from "../components/HeroSection";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import LiveTicker from "../components/LiveTicker";
import TournamentSpotlight from "../components/TournamentSpotlight";
import LiveCard from "../components/ScoreSummaryCard";
import LiveDot from "../components/LiveDot";
import UpcomingCard from "../components/Upcoming";
import Recent from "../components/Recent";
import { EmptyBox, ErrorBox, SkeletonCard } from "../components/States";
import { api, homeSocket, unwrap } from "../lib/api";

function SectionHeader({ icon, title, subtitle, onViewAll, count }) {
  return (
    <div className="flex flex-row justify-between items-end gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-lime-500 shrink-0"
          />
          <h2 className="font-condensed font-bold uppercase tracking-wide text-[28px] leading-none text-heading flex items-center">
            {icon}
            {title}
          </h2>
          {count != null && count > 0 && (
            <span className="count-pill">{count}</span>
          )}
        </div>
        {subtitle && (
          <p className="text-[13px] text-subheading mt-1.5 ml-3.5 font-inter">
            {subtitle}
          </p>
        )}
      </div>
      {onViewAll && (
        <button
          type="button"
          className="text-sm font-semibold text-secondary cursor-pointer p-2 rounded-xl hover:text-emerald-500 transition-colors shrink-0"
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
      <div className="flex flex-row flex-wrap gap-5 justify-center lg:justify-start mt-5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  if (!items || items.length === 0) {
    return (
      <div className="mt-5">
        <EmptyBox message={emptyText} />
      </div>
    );
  }
  return (
    <div className="flex flex-row flex-wrap gap-5 justify-center lg:justify-start mt-5">
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

  /* ------------------------- hero feature ------------------------- */
  const featuredVariant = liveMatches.length > 0 ? "live" : "recent";
  const featuredMatch = liveMatches[0] || recentMatches[0] || null;
  const [featuredDetail, setFeaturedDetail] = useState(null);

  // Refetch the featured match's detail (engine state → win meter,
  // this-over) whenever its score signature moves.
  const featuredSig = useMemo(() => {
    if (!featuredMatch) return "";
    const runs = (featuredMatch.innings || []).reduce(
      (a, i) => a + (i?.runs || 0) * 100 + (i?.wickets || 0),
      0
    );
    return `${featuredMatch._id}|${runs}`;
  }, [featuredMatch]);

  useEffect(() => {
    if (!featuredMatch?._id) {
      setFeaturedDetail(null);
      return;
    }
    const ctrl = new AbortController();
    api
      .get(`/view/matches/${featuredMatch._id}`, { signal: ctrl.signal })
      .then((res) => setFeaturedDetail(unwrap(res)))
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredSig]);

  /* ----------------------- tournament spotlight -------------------- */
  const spotlightTournament = tournaments[0] || null;
  const [spotPoints, setSpotPoints] = useState(null);
  const [spotStats, setSpotStats] = useState(null);
  const [spotLoading, setSpotLoading] = useState(false);

  useEffect(() => {
    if (!spotlightTournament?._id) return;
    const ctrl = new AbortController();
    setSpotPoints(null);
    setSpotStats(null);
    setSpotLoading(true);
    const done = () => {
      if (!ctrl.signal.aborted) setSpotLoading(false);
    };
    api
      .get(`/view/tournaments/${spotlightTournament._id}/points-table`, {
        signal: ctrl.signal,
      })
      .then((res) => setSpotPoints(unwrap(res) || []))
      .catch(() => {})
      .finally(done);
    api
      .get(`/view/tournaments/${spotlightTournament._id}/stats`, {
        signal: ctrl.signal,
      })
      .then((res) => setSpotStats(unwrap(res) || null))
      .catch(() => {})
      .finally(done);
    return () => ctrl.abort();
  }, [spotlightTournament?._id]);

  const handleViewAll = (type) => navigate(`/matches/${type}`);

  return (
    <>
      <LiveTicker matches={liveMatches} />
      <section className="px-4 md:px-10 pb-10 min-h-screen max-w-[1400px] mx-auto w-full">
        {/* hero */}
        <HeroSection
          featuredMatch={featuredMatch}
          featuredDetail={featuredDetail}
          featuredVariant={featuredVariant}
        />

        {/* Live Matches */}
        <div className="mt-10">
          <SectionHeader
            icon={<LiveDot className="mr-2.5" />}
            title="Live Matches"
            subtitle="Happening now on CricScore."
            count={liveMatches.length}
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

        {/* Tournament spotlight */}
        {spotlightTournament && (
          <div className="mt-14">
            <TournamentSpotlight
              tournament={spotlightTournament}
              allTournaments={tournaments}
              points={spotPoints}
              stats={spotStats}
              loading={spotLoading}
            />
          </div>
        )}

        {/* upcoming */}
        <div className="mt-14">
          <SectionHeader
            icon={
              <Calendar size={19} className="mr-2 text-amber-500 align-middle" />
            }
            title="Upcoming Matches"
            subtitle="Don't miss the action ahead."
            count={upcomingMatches.length}
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

        {/* features */}
        <div className="mt-16 cv-auto">
          <SectionHeader
            icon={
              <BarChart3 size={19} className="mr-2 text-emerald-500 align-middle" />
            }
            title="Built Like a Broadcast"
            subtitle="The analytics suite the big platforms charge attention for — free for your ground."
          />
          <Features />
        </div>

        {/* how it works */}
        <div className="mt-16 cv-auto">
          <SectionHeader
            icon={
              <Sparkles size={19} className="mr-2 text-lime-500 align-middle" />
            }
            title="Run Your Tournament"
            subtitle="From first fixture to final — in three steps."
          />
          <HowItWorks />
        </div>

        {/* recently completed */}
        <div className="mt-16">
          <SectionHeader
            icon={
              <ClockFading size={19} className="mr-2 text-sky-500 align-middle" />
            }
            title="Recently Concluded"
            subtitle="Have a look at the recent thrillers."
            count={recentMatches.length}
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
              <Trophy size={19} className="mr-2 text-emerald-500 align-middle" />
            }
            title="Tournaments"
            subtitle="Follow your favourite."
            count={tournaments.length}
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
    </>
  );
};

export default Home;
