import { actionFor, isKept, isTap, shouldCommit, swipeDirection } from "../deckLogic";

describe("swipeDirection", () => {
  it("maps horizontal drags to like/pass", () => {
    expect(swipeDirection(120, 5)).toBe("like");
    expect(swipeDirection(-120, -5)).toBe("nope");
  });
  it("maps vertical drags to maybe/seen", () => {
    expect(swipeDirection(5, -120)).toBe("maybe");
    expect(swipeDirection(-5, 120)).toBe("watched");
  });
  it("breaks ties toward horizontal", () => {
    expect(swipeDirection(80, 80)).toBe("like");
    expect(swipeDirection(-80, 80)).toBe("nope");
  });
});

describe("shouldCommit", () => {
  it("commits past the distance threshold", () => {
    expect(shouldCommit(100, 0, 0, 0)).toBe(true);
    expect(shouldCommit(40, 0, 0, 0)).toBe(false);
  });
  it("commits on a fast flick even below the threshold", () => {
    expect(shouldCommit(30, 0, 1.2, 0)).toBe(true);
    expect(shouldCommit(10, 0, 1.2, 0)).toBe(false); // too small to count
  });
});

describe("isTap", () => {
  it("treats a near-still release as a tap", () => {
    expect(isTap(2, 3)).toBe(true);
    expect(isTap(20, 0)).toBe(false);
  });
});

describe("actionFor / isKept", () => {
  it("records nope as dislike, others unchanged", () => {
    expect(actionFor("nope")).toBe("dislike");
    expect(actionFor("like")).toBe("like");
    expect(actionFor("maybe")).toBe("maybe");
    expect(actionFor("watched")).toBe("watched");
  });
  it("keeps likes and maybes for the shortlist", () => {
    expect(isKept("like")).toBe(true);
    expect(isKept("maybe")).toBe(true);
    expect(isKept("nope")).toBe(false);
    expect(isKept("watched")).toBe(false);
  });
});
