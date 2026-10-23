import { describe, expect, it } from "vitest";
import {
  ballLabels,
  ballSymbol,
  detailViewModel,
  eventSummary,
  findInnings,
  fmt2,
  inningsView,
  matchFormat,
  oversTextFromBalls,
  shadeHex,
  squadPlayers,
  teamAWinPct,
  teamColorClass,
  teamColorHex,
  teamInitials,
} from "./cricket";

/* Fixtures follow the real payload shapes: stored innings documents
   are snake_case (Innings model), engine states are camelCase. */

const snapshotInnings = {
  batting_team: "ta",
  runs: 120,
  wickets: 4,
  over: 15,
  balls: 3,
  current_run_rate: 7.74,
  required_run_rate: null,
  target: 0,
  status: "inProgress",
  inningNumber: 1,
  extras: { wide: 3, no_ball: 1, bye: 2, leg_bye: 1, penalty: 0 },
  batsmen: [
    {
      batsmanId: "p1",
      name: "Opener One",
      runs: 54,
      balls: 40,
      fours: 6,
      sixes: 1,
      strike_rate: 135,
      status: "batting",
      how_out: "",
    },
  ],
  bowlers: [
    {
      bowlerId: "p9",
      name: "Seamer Nine",
      balls: 24,
      maidens: 0,
      runs_conceded: 31,
      wickets: 2,
      economy: 7.75,
      extras: { wide: 1, no_ball: 0 },
    },
  ],
  this_over: ["1", "4", "•"],
};

describe("fmt2 / oversTextFromBalls", () => {
  it("formats rates to two decimals and tolerates junk", () => {
    expect(fmt2(9)).toBe("9.00");
    expect(fmt2("8.5")).toBe("8.50");
    expect(fmt2(null)).toBe("0.00");
    expect(fmt2(undefined)).toBe("0.00");
    expect(fmt2("x")).toBe("0.00");
  });

  it("renders cricket overs notation from legal balls", () => {
    expect(oversTextFromBalls(0)).toBe("0.0");
    expect(oversTextFromBalls(6)).toBe("1.0");
    expect(oversTextFromBalls(11)).toBe("1.5");
    expect(oversTextFromBalls(93)).toBe("15.3");
    expect(oversTextFromBalls(-4)).toBe("0.0");
    expect(oversTextFromBalls()).toBe("0.0");
  });
});

describe("inningsView from a stored snapshot", () => {
  const view = inningsView(snapshotInnings, null);

  it("derives legal balls and overs text from over.balls", () => {
    expect(view.runs).toBe(120);
    expect(view.wickets).toBe(4);
    expect(view.legalBalls).toBe(93);
    expect(view.oversText).toBe("15.3");
  });

  it("prefers an explicit legal_balls count when present", () => {
    const v = inningsView({ ...snapshotInnings, legal_balls: 50 }, null);
    expect(v.legalBalls).toBe(50);
    expect(v.oversText).toBe("8.2");
  });

  it("maps snake_case extras and totals them", () => {
    expect(view.extras).toEqual({
      wide: 3,
      noBall: 1,
      bye: 2,
      legBye: 1,
      penalty: 0,
      total: 7,
    });
  });

  it("maps batsmen and bowlers to the view shape", () => {
    expect(view.batsmen[0]).toMatchObject({
      id: "p1",
      name: "Opener One",
      sr: 135,
      batting: true,
    });
    expect(view.bowlers[0]).toMatchObject({
      id: "p9",
      runsConceded: 31,
      oversText: "4.0",
      noBall: 0,
    });
  });

  it("computes runs needed from a target", () => {
    const chase = inningsView(
      { ...snapshotInnings, target: 181 },
      null
    );
    expect(chase.runsNeeded).toBe(61);
    expect(inningsView(snapshotInnings, null).runsNeeded).toBeNull();
  });
});

describe("inningsView from an engine state", () => {
  const state = {
    runs: 45,
    wickets: 1,
    legalBalls: 30,
    oversText: "5.0",
    currentRunRate: 9,
    requiredRunRate: null,
    winProbability: { batting: 62, bowling: 38 },
    batsmen: [
      {
        id: "p1",
        name: "Opener One",
        runs: 20,
        balls: 15,
        fours: 2,
        sixes: 0,
        strikeRate: 133.33,
        status: "batting",
        howOut: "",
      },
    ],
    bowlers: [],
    thisOver: ["1", "4"],
  };
  const view = inningsView(null, state);

  it("reads the camelCase state fields", () => {
    expect(view.runs).toBe(45);
    expect(view.legalBalls).toBe(30);
    expect(view.crr).toBe(9);
    expect(view.winProbability).toEqual({ batting: 62, bowling: 38 });
    expect(view.batsmen[0].sr).toBe(133.33);
    expect(view.thisOver).toEqual(["1", "4"]);
  });

  it("returns null when neither shape exists", () => {
    expect(inningsView(null, null)).toBeNull();
  });

  it("surfaces awaitingBatsman from the engine state (scorer picker exclusion)", () => {
    // ScorerConsole passes view.awaitingBatsman to the batsman picker to
    // exclude retired-hurt players when a crease slot is empty. The flag
    // must pass through the view model or the exclusion never fires.
    expect(inningsView(null, { ...state, awaitingBatsman: true }).awaitingBatsman).toBe(true);
    expect(view.awaitingBatsman).toBe(false);
    expect(inningsView(snapshotInnings, null).awaitingBatsman).toBe(false);
  });
});

describe("ballLabels", () => {
  it("extras share the label of the legal ball they precede", () => {
    const events = [
      { extras: {} },
      { extras: { wide: 1 } },
      { extras: {} },
      { extras: { noBall: 1 } },
      { extras: {} },
    ];
    expect(ballLabels(events)).toEqual(["0.1", "0.2", "0.2", "0.3", "0.3"]);
  });

  it("rolls into the next over after six legal balls", () => {
    const events = Array.from({ length: 7 }, () => ({ extras: {} }));
    expect(ballLabels(events)[6]).toBe("1.1");
  });
});

describe("ballSymbol / eventSummary", () => {
  it("renders runs, boundaries and dots", () => {
    expect(ballSymbol({ batRuns: 4 })).toBe("4");
    expect(ballSymbol({ batRuns: 6 })).toBe("6");
    expect(ballSymbol({ batRuns: 0 })).toBe("•");
    expect(ballSymbol({ batRuns: 2 })).toBe("2");
  });

  it("renders wickets, with runs completed on a run out", () => {
    expect(ballSymbol({ wicket: { type: "bowled" }, batRuns: 0 })).toBe("W");
    expect(ballSymbol({ wicket: { type: "run_out" }, batRuns: 2 })).toBe("2W");
    expect(
      ballSymbol({ wicket: { type: "retired_hurt" }, batRuns: 1 })
    ).toBe("1");
  });

  it("renders extras", () => {
    expect(ballSymbol({ extras: { wide: 1 } })).toBe("Wd");
    expect(ballSymbol({ extras: { wide: 3 } })).toBe("2Wd");
    expect(ballSymbol({ extras: { noBall: 1 }, batRuns: 2 })).toBe("2Nb");
    expect(ballSymbol({ extras: { noBall: 1 } })).toBe("Nb");
    expect(ballSymbol({ extras: { bye: 2 } })).toBe("2b");
    expect(ballSymbol({ extras: { legBye: 1 } })).toBe("1lb");
  });

  it("summarises events in words", () => {
    expect(eventSummary({ batRuns: 4 })).toBe("FOUR");
    expect(eventSummary({ batRuns: 6 })).toBe("SIX");
    expect(eventSummary({})).toBe("no run");
    expect(eventSummary({ wicket: { type: "bowled" } })).toBe("WICKET");
    expect(eventSummary({ batRuns: 2, extras: { noBall: 1 } })).toBe(
      "no ball, 2 runs"
    );
    expect(eventSummary({ extras: { wide: 2 } })).toBe("2 wides");
  });
});

describe("team identity helpers", () => {
  it("builds monogram initials", () => {
    expect(teamInitials("Kathmandu Kings")).toBe("KK");
    expect(teamInitials("Urlabari")).toBe("UR");
    expect(teamInitials("A B C")).toBe("AB");
    expect(teamInitials("")).toBe("?");
    expect(teamInitials(null)).toBe("?");
  });

  it("assigns deterministic colours from the palette", () => {
    expect(teamColorHex("Kathmandu Kings")).toMatch(/^#[0-9a-f]{6}$/);
    expect(teamColorHex("Kathmandu Kings")).toBe(
      teamColorHex("Kathmandu Kings")
    );
    expect(teamColorClass("Kathmandu Kings")).toMatch(/^bg-/);
    expect(teamColorClass("Kathmandu Kings")).toBe(
      teamColorClass("Kathmandu Kings")
    );
  });

  it("shades hex colours and passes bad input through", () => {
    expect(shadeHex("#000000", 100)).toBe("#ffffff");
    expect(shadeHex("#ffffff", -100)).toBe("#000000");
    expect(shadeHex("red", 10)).toBe("red");
  });
});

describe("findInnings / matchFormat / squadPlayers", () => {
  const match = {
    innings: [{ batting_team: "ta" }, { batting_team: "tb" }],
    tournament_id: { format: 20 },
  };

  it("finds the innings a team batted, with id coercion", () => {
    expect(findInnings(match, "tb")).toEqual({ batting_team: "tb" });
    expect(findInnings(match, "tx")).toBeNull();
    expect(findInnings(null, "ta")).toBeNull();
    expect(findInnings({ innings: [{ batting_team: 5 }] }, "5")).toEqual({
      batting_team: 5,
    });
  });

  it("reads the format from a populated tournament only", () => {
    expect(matchFormat(match)).toBe(20);
    expect(matchFormat({ tournament_id: "abc" })).toBeNull();
    expect(matchFormat(null)).toBeNull();
  });

  it("extracts squad player lists from the response shapes", () => {
    const doc = { players: [{ name: "A" }, { name: "B" }] };
    expect(squadPlayers({ players: [doc] })).toEqual(doc.players);
    expect(squadPlayers([doc])).toEqual(doc.players);
    expect(squadPlayers({ data: { players: [doc] } })).toEqual(doc.players);
    expect(squadPlayers(null)).toEqual([]);
    expect(squadPlayers({ players: [] })).toEqual([]);
  });
});

describe("detailViewModel", () => {
  const detail = {
    innings: [
      { inning: { batting_team: "ta", status: "completed" }, state: null },
      { inning: { batting_team: "tb", status: "inProgress" }, state: null },
    ],
  };

  it("composes views, per-team lookup and the active innings", () => {
    const vm = detailViewModel(detail);
    expect(vm.entries).toHaveLength(2);
    expect(vm.viewFor("ta")).toBe(vm.views[0]);
    expect(vm.viewFor("tb")).toBe(vm.views[1]);
    expect(vm.viewFor("tx")).toBeNull();
    expect(vm.activeIndex).toBe(1);
    expect(vm.activeEntry).toBe(vm.entries[1]);
    expect(vm.activeView).toBe(vm.views[1]);
  });

  it("falls back to the latest innings when none is live", () => {
    const vm = detailViewModel({
      innings: [
        { inning: { batting_team: "ta", status: "completed" }, state: null },
      ],
    });
    expect(vm.activeIndex).toBe(0);
  });

  it("handles an empty detail", () => {
    const vm = detailViewModel(null);
    expect(vm.entries).toEqual([]);
    expect(vm.activeIndex).toBe(-1);
    expect(vm.activeView).toBeNull();
  });
});

describe("teamAWinPct", () => {
  const chase = (battingTeam, batting, bowling) => [
    {
      inning: { batting_team: battingTeam, status: "inProgress" },
      state: { winProbability: { batting, bowling } },
    },
  ];

  it("settles at 100/0 from a recorded winner", () => {
    expect(teamAWinPct({ teamA_id: "ta", winner: "ta" }, [])).toBe(100);
    expect(teamAWinPct({ teamA_id: "ta", winner: "tb" }, [])).toBe(0);
  });

  it("reads the engine figure, flipped when team A fields", () => {
    expect(teamAWinPct({ teamA_id: "ta" }, chase("ta", 65, 35))).toBe(65);
    expect(teamAWinPct({ teamA_id: "ta" }, chase("tb", 70, 30))).toBe(30);
  });

  it("is null without a winner or an engine figure", () => {
    expect(teamAWinPct({ teamA_id: "ta" }, [])).toBeNull();
    expect(
      teamAWinPct({ teamA_id: "ta" }, [
        { inning: { batting_team: "ta" }, state: null },
      ])
    ).toBeNull();
    expect(teamAWinPct(null, chase("ta", 50, 50))).toBeNull();
  });
});
