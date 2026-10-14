// Shared by the browser check and the server that records it.

export const MOVES = {
  turn: "Turn your head to one side",
  smile: "Give us a big smile",
  mouth: "Open your mouth wide",
} as const;

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
    r.moves.length === 3 &&
    r.match >= THRESHOLDS.match &&
    r.real >= THRESHOLDS.real &&
    r.live >= THRESHOLDS.live &&
    r.minAge >= THRESHOLDS.minAge
  );
}
