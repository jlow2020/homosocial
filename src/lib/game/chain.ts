// The Chain ends when the line count hits this. Whoever's next writes the ending.
export function chainEndingAt(members: number): number {
  return Math.max(4, Math.min(members - 1, 20));
}
