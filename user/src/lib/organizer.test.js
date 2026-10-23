import { describe, expect, it } from "vitest";
import {
  duplicateNames,
  filterTournamentMatches,
  matchHasXI,
  matchTournamentId,
  normalizeRole,
  parseNames,
  parsePastedNames,
} from "./organizer";

describe("normalizeRole", () => {
  it("keeps valid roles and defaults everything else", () => {
    expect(normalizeRole("Bowler")).toBe("Bowler");
    expect(normalizeRole("Wicket-Keeper")).toBe("Wicket-Keeper");
    expect(normalizeRole("keeper")).toBe("Batsman");
    expect(normalizeRole(undefined)).toBe("Batsman");
    expect(normalizeRole(null)).toBe("Batsman");
  });
});

describe("name list parsing", () => {
  it("parses one-name-per-line text, trimmed, blanks dropped", () => {
    expect(parseNames("  Ram Bahadur\n\nShyam Karki \n Hari")).toEqual([
      "Ram Bahadur",
      "Shyam Karki",
      "Hari",
    ]);
    expect(parseNames("")).toEqual([]);
    expect(parseNames(null)).toEqual([]);
  });

  it("parses pasted lists split on commas and newlines", () => {
    expect(parsePastedNames("A, B\nC,,D")).toEqual(["A", "B", "C", "D"]);
  });

  it("flags case-insensitive duplicates by first-seen spelling", () => {
    expect(duplicateNames(["Ram", "shyam", "RAM", "Shyam", "Hari"])).toEqual([
      "Ram",
      "shyam",
    ]);
    expect(duplicateNames(["A", "B"])).toEqual([]);
  });
});

describe("matchTournamentId", () => {
  it("resolves plain and populated tournament references", () => {
    expect(matchTournamentId({ tournament_id: "t1" })).toBe("t1");
    expect(matchTournamentId({ tournament_id: { _id: "t2" } })).toBe("t2");
    expect(matchTournamentId({ tournament_id: { _id: 7 } })).toBe("7");
    expect(matchTournamentId({})).toBeNull();
    expect(matchTournamentId({ tournament_id: {} })).toBeNull();
    expect(matchTournamentId(null)).toBeNull();
  });
});

describe("matchHasXI", () => {
  const xi = (n) => ({ players: Array.from({ length: n }, () => ({})) });

  it("treats live and completed matches as having XIs", () => {
    expect(matchHasXI({ matchState: "live" })).toBe(true);
    expect(matchHasXI({ matchState: "Completed" })).toBe(true);
  });

  it("inspects the stored playingXI for upcoming matches", () => {
    expect(
      matchHasXI({ matchState: "upcoming", playingXI: [xi(11), xi(11)] })
    ).toBe(true);
    expect(
      matchHasXI({ matchState: "upcoming", playingXI: [xi(11), xi(10)] })
    ).toBe(false);
    expect(matchHasXI({ matchState: "upcoming" })).toBe(false);
    expect(matchHasXI(null)).toBe(false);
  });
});

describe("filterTournamentMatches", () => {
  const list = [
    { _id: "m1", tournament_id: "t1", tournament_name: "City Cup" },
    { _id: "m2", tournament_id: "t2", tournament_name: "City Cup" },
    { _id: "m3", tournament_name: "City Cup" },
    { _id: "m4", tournament_name: "Village Shield" },
  ];

  it("matches by tournament id, falling back to the name", () => {
    const out = filterTournamentMatches(list, "t1", "City Cup");
    expect(out.map((m) => m._id)).toEqual(["m1", "m3"]);
  });

  it("returns nothing for an unknown tournament", () => {
    expect(filterTournamentMatches(list, "t9", "Nowhere Cup")).toEqual([]);
    expect(filterTournamentMatches(null, "t1", "City Cup")).toEqual([]);
  });

  it("does not fall back to names when no name is known", () => {
    const out = filterTournamentMatches(list, "t1", null);
    expect(out.map((m) => m._id)).toEqual(["m1"]);
  });
});
