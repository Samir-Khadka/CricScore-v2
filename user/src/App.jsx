import { Suspense, lazy } from "react";
import { Navigate, Routes, Route, useParams } from "react-router-dom";
import Home from "./pages/Home";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import { Spinner } from "./components/States";

// Route-level code splitting: the home page ships in the initial
// chunk; every other route — including the heavy organizer/scorer
// surfaces — is downloaded only when actually visited.
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentInfo = lazy(() => import("./pages/TournamentInfo"));
const Match = lazy(() => import("./pages/Match"));
const Matches = lazy(() => import("./pages/Matches"));
const Login = lazy(() => import("./pages/Login"));
const ScorerMatches = lazy(() => import("./pages/ScorerMatches"));
const ScorerConsole = lazy(() => import("./pages/ScorerConsole"));
const ManageTournament = lazy(() => import("./pages/ManageTournament"));
const MatchSetup = lazy(() => import("./pages/MatchSetup"));
const NotFound = lazy(() => import("./pages/NotFound"));

/** Legacy deep link: /match/:tourName/:matchName/:matchId → /match/:matchId */
function LegacyMatchRedirect() {
  const { matchId } = useParams();
  return <Navigate to={`/match/${matchId}`} replace />;
}

function App() {
  return (
    <>
      <NavBar />
      <main>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-[60vh]">
                <Spinner label="Loading…" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournament/:tourname" element={<TournamentInfo />} />
              <Route path="/match/:matchId" element={<Match />} />
              <Route
                path="/match/:tourName/:matchName/:matchId"
                element={<LegacyMatchRedirect />}
              />
              <Route path="/match" element={<Navigate to="/matches/live" replace />} />
              <Route path="/matches/:type" element={<Matches />} />
              <Route path="/matches" element={<Navigate to="/matches/live" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/score" element={<ScorerMatches />} />
              <Route path="/score/:matchId" element={<ScorerConsole />} />
              <Route path="/manage/:tournamentId" element={<ManageTournament />} />
              <Route
                path="/manage/:tournamentId/match/:matchId/setup"
                element={<MatchSetup />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  );
}

export default App;
