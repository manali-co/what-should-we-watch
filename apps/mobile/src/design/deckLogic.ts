// Pure swipe-decision logic for the deck, kept out of the component so it can be unit-tested.
export type Kind = "like" | "nope" | "maybe" | "watched";
export type Action = "like" | "dislike" | "maybe" | "watched";

export const THRESH = 96;
export const VELOCITY = 0.8; // px/ms
export const TAP_SLOP = 6;

/** Direction of a swipe from its displacement. Horizontal wins ties. */
export function swipeDirection(dx: number, dy: number): Kind {
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "like" : "nope") : dy < 0 ? "maybe" : "watched";
}

/** Whether a gesture should commit a decision (past distance threshold, or a fast flick). */
export function shouldCommit(dx: number, dy: number, vx: number, vy: number): boolean {
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  const v = Math.hypot(vx, vy);
  return dist >= THRESH || (v > VELOCITY && dist > 24);
}

/** A near-still release is a tap (opens the trailer). */
export function isTap(dx: number, dy: number): boolean {
  return Math.max(Math.abs(dx), Math.abs(dy)) < TAP_SLOP;
}

/** Map a swipe kind to the decision action recorded for the API. */
export const actionFor = (k: Kind): Action => (k === "nope" ? "dislike" : k);

/** Films kept for the shortlist are the likes and maybes. */
export const isKept = (k: Kind): boolean => k === "like" || k === "maybe";
