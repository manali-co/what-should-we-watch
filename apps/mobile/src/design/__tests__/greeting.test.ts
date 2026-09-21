import { formatRuntime } from "../../films";

// greeting.ts computes from the real Date; we test the pure formatter here and the
// greeting selection via a frozen clock.
describe("formatRuntime", () => {
  it("drops a leading 0 h for short films", () => {
    expect(formatRuntime(34)).toBe("34 m");
    expect(formatRuntime(103)).toBe("1 h 43 m");
    expect(formatRuntime(120)).toBe("2 h");
    expect(formatRuntime(0)).toBe("");
    expect(formatRuntime(null)).toBe("");
  });
});

describe("currentGreeting", () => {
  const realNow = Date.now;
  afterEach(() => { global.Date.now = realNow; jest.useRealTimers(); });

  function at(iso: string) {
    jest.useFakeTimers().setSystemTime(new Date(iso));
  }

  it("greets a fresh user by name and keeps the completion", () => {
    at("2026-06-10T20:00:00"); // Wed evening, summer
    const { currentGreeting } = require("../greeting");
    const g = currentGreeting("Manali", true);
    expect(g.text).toContain("Let’s start simple, Manali");
    expect(g.text).toContain("feels like");
  });

  it("uses the late-night line after 23:00", () => {
    at("2026-06-10T23:30:00");
    const { currentGreeting } = require("../greeting");
    const g = currentGreeting("Manali", false);
    expect(g.text).toContain("Still up");
    expect(g.id).toBe("late");
  });

  it("uses the Sunday-night line", () => {
    at("2026-06-14T20:00:00"); // Sunday evening
    const { currentGreeting } = require("../greeting");
    const g = currentGreeting(undefined, false);
    expect(g.id).toBe("sunday");
  });

  it("falls back to the default weeknight line", () => {
    at("2026-04-08T20:00:00"); // Wednesday evening, spring (no season/holiday line)
    const { currentGreeting } = require("../greeting");
    const g = currentGreeting(undefined, false);
    expect(g.id).toBe("default");
    expect(g.text).toBe("Tonight feels like…");
  });
});
