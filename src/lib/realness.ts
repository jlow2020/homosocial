// Shared by the browser check and the server that records it.

export const MOVES = {
  smile: "Smile",
  up: "Lift your chin",
  blink: "Close your eyes for a second",
  tilt: "Tilt your head",
} as const;

// Three of these, in a random order, each attempt.
export const MOVES_PER_CHECK = 3;

export type Move = keyof typeof MOVES;

// Tuned to be forgiving on phone cameras. Every result is saved with the
// scores, so these can be tightened later without guessing.
export const THRESHOLDS = {
  match: 0.5, // face in the camera vs. profile photo
  // The passive real/live models scored a still photo as "live" in testing, so
  // they only catch blatant failures. The random moves with a neutral reset
  // between them are what actually stop photos and replays.
  real: 0.2,
  live: 0.2,
  minAge: 16, // estimated age floor; birthday already says 18+
};

export type RealnessResult = {
  moves: Move[];
  match: number;
  moveMatch?: number;
  real: number;
  live: number;
  minAge: number;
  durationMs: number;
};

export function passes(r: RealnessResult): boolean {
  return (
    r.moves.length === MOVES_PER_CHECK &&
    r.match >= THRESHOLDS.match &&
    r.real >= THRESHOLDS.real &&
    r.live >= THRESHOLDS.live &&
    r.minAge >= THRESHOLDS.minAge
  );
}
