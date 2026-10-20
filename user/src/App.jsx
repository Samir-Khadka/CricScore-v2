import { Navigate, Routes, Route, useParams } from "react-router-dom";
import Home from "./pages/Home";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import Tournaments from "./pages/Tournaments";
import TournamentInfo from "./pages/TournamentInfo";
import Match from "./pages/Match";
import Matches from "./pages/Matches";
import Login from "./pages/Login";
import ScorerMatches from "./pages/ScorerMatches";
import ScorerConsole from "./pages/ScorerConsole";
import NotFound from "./pages/NotFound";

/** Legacy deep link: /match/:tourName/:matchName/:matchId → /match/:matchId */
function LegacyMatchRedirect() {
  const { matchId } = useParams();
  return <Navigate to={`/match/${matchId}`} replace />;
}

function App() {
  return (
    <>
      <NavBar />
      <ErrorBoundary>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
      <Footer />
    </>
  );
}

export default App;
