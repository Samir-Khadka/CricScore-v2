import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LiveCard from "./ScoreSummaryCard";
import Recent from "./Recent";
import UpcomingCard from "./Upcoming";

/**
 * Card state tests: the three match-card variants rendered from the
 * list payload shape (viewerController populates innings documents).
 * Assertions are on what a spectator reads — scores, badges, results —
 * never on markup structure.
 */

const base = {
  tournament_name: "Urlabari Premier League",
  venue: "Urlabari Ground",
  teamA: "Urlabari Warriors",
  teamB: "Dharan Stars",
  teamA_id: "ta",
  teamB_id: "tb",
  tournament_id: { format: 20 },
};

const liveMatch = {
  ...base,
  _id: "m-live",
  matchState: "live",
  inning_in_progress: 1,
  innings: [
    {
      batting_team: "ta",
      runs: 86,
      wickets: 3,
      over: 10,
      balls: 2,
      current_run_rate: 8.34,
      this_over: ["1", "4", "•"],
    },
  ],
  toss: { wonBy: "ta", decision: "bat" },
};

const completedMatch = {
  ...base,
  _id: "m-done",
  matchState: "completed",
  winner: "ta",
  result: "Urlabari Warriors won by 7 wickets",
  match_date: "2026-10-20",
  match_time: "11:00",
  innings: [
    { batting_team: "tb", runs: 149, wickets: 8, over: 20, balls: 0 },
    { batting_team: "ta", runs: 150, wickets: 3, over: 18, balls: 4 },
  ],
};

const upcomingMatch = {
  ...base,
  _id: "m-next",
  matchState: "upcoming",
  match_date: "2026-10-25",
  match_time: "09:30",
  innings: [],
};

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("LiveCard (live match)", () => {
  it("shows the LIVE badge, both teams and the current score", () => {
    wrap(<LiveCard data={liveMatch} />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("Urlabari Warriors")).toBeInTheDocument();
    expect(screen.getByText("Dharan Stars")).toBeInTheDocument();
    expect(screen.getByText(/86\/3/)).toBeInTheDocument();
    expect(screen.getByText(/\(10\.2\/20\)/)).toBeInTheDocument();
  });

  it("shows the side yet to bat as such, plus the run rate", () => {
    wrap(<LiveCard data={liveMatch} />);
    expect(screen.getByText("Yet to bat")).toBeInTheDocument();
    expect(screen.getByText("8.34")).toBeInTheDocument();
  });

  it("links to the match page", () => {
    wrap(<LiveCard data={liveMatch} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/match/m-live");
  });
});

describe("Recent (completed match)", () => {
  it("states the result and both innings scores", () => {
    wrap(<Recent data={completedMatch} />);
    expect(
      screen.getByText("Urlabari Warriors won by 7 wickets")
    ).toBeInTheDocument();
    expect(screen.getByText(/150\/3/)).toBeInTheDocument();
    expect(screen.getByText(/149\/8/)).toBeInTheDocument();
  });

  it("links to the match page", () => {
    wrap(<Recent data={completedMatch} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/match/m-done");
  });
});

describe("UpcomingCard (fixture)", () => {
  it("shows both teams, the date and the start time — no scores", () => {
    wrap(<UpcomingCard data={upcomingMatch} />);
    expect(screen.getByText("Urlabari Warriors")).toBeInTheDocument();
    expect(screen.getByText("Dharan Stars")).toBeInTheDocument();
    expect(screen.getByText(/25 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  it("links to the match page", () => {
    wrap(<UpcomingCard data={upcomingMatch} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/match/m-next");
  });
});
