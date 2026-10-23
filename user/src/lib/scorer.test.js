import { describe, expect, it } from "vitest";
import {
  batsmanDisabledIds,
  bowlerDisabledIds,
  outBatsmanIds,
  pickCreaseSelection,
} from "./scorer";

describe("outBatsmanIds", () => {
  it("collects out batsmen from state rows (id or batsmanId)", () => {
    const ids = outBatsmanIds([
      { id: "1", status: "out" },
      { id: "2", status: "batting" },
      { batsmanId: "3", status: "out" },
      { id: "4", status: "retired hurt" },
    ]);
    expect(ids).toEqual(new Set(["1", "3"]));
    expect(outBatsmanIds(null)).toEqual(new Set());
  });
});

describe("pickCreaseSelection", () => {
  const squad = new Set(["p1", "p2", "p3"]);

  it("takes the engine's pick when it is valid", () => {
    expect(pickCreaseSelection("p1", null, squad, new Set())).toBe("p1");
  });

  it("never resurrects a dismissed batsman from the engine pick", () => {
    // Engine still points at the out man; the scorer's other pick stands.
    expect(pickCreaseSelection("p1", "p2", squad, new Set(["p1"]))).toBe("p2");
    // Both gone → the end is empty and the picker must open.
    expect(
      pickCreaseSelection("p1", "p2", squad, new Set(["p1", "p2"]))
    ).toBeNull();
  });

  it("keeps the scorer's previous pick when the engine has none", () => {
    expect(pickCreaseSelection(null, "p3", squad, new Set())).toBe("p3");
    expect(pickCreaseSelection(null, null, squad, new Set())).toBeNull();
  });

  it("drops a previous pick that left the squad", () => {
    expect(pickCreaseSelection(null, "p9", squad, new Set())).toBeNull();
  });

  it("trusts the engine while the squad has not loaded", () => {
    expect(pickCreaseSelection("p9", null, new Set(), new Set())).toBe("p9");
    expect(pickCreaseSelection(null, "p9", new Set(), new Set())).toBe("p9");
  });
});

describe("batsmanDisabledIds", () => {
  const batsmen = [
    { id: "1", status: "out" },
    { id: "2", status: "retired hurt" },
    { id: "3", status: "batting" },
    { id: "4", status: "yet to bat" },
  ];

  it("disables out batsmen and the man at the other end", () => {
    expect(batsmanDisabledIds(batsmen, "3", false)).toEqual(
      new Set(["1", "3"])
    );
  });

  it("adds retired batsmen only when the innings awaits a new man", () => {
    expect(batsmanDisabledIds(batsmen, null, true)).toEqual(
      new Set(["1", "2"])
    );
    expect(batsmanDisabledIds(batsmen, null, false)).toEqual(new Set(["1"]));
  });
});

describe("bowlerDisabledIds", () => {
  const bowlers = [
    { id: "1", balls: 24 },
    { id: "2", balls: 60 },
    { id: "3", balls: 6 },
  ];

  it("at an over start, blocks the last bowler and maxed-out bowlers", () => {
    const ids = bowlerDisabledIds(bowlers, {
      overStart: true,
      lastOverBowlerId: "3",
      maxBalls: 24,
    });
    expect(ids).toEqual(new Set(["1", "2", "3"]));
  });

  it("mid-over nobody is blocked by these rules", () => {
    const ids = bowlerDisabledIds(bowlers, {
      overStart: false,
      lastOverBowlerId: "3",
      maxBalls: 24,
    });
    expect(ids).toEqual(new Set());
  });
});
