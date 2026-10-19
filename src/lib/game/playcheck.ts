// Checks a play answer against its spec. Returns a message for the guy, or null if it's fine.
import type { PlaySpec } from "./plays";

const str = (x: unknown, max: number) => typeof x === "string" && x.trim().length > 0 && x.length <= max;

export function checkPlayAnswer(spec: PlaySpec, data: unknown): string | null {
  const d = data as Record<string, unknown> | null;
  switch (spec.kind) {
    case "survey": {
      const a = d?.answers;
      if (!Array.isArray(a) || a.length !== spec.questions.length || !a.every((x) => typeof x === "boolean")) return "Answer every question.";
      return null;
    }
    case "thisorthat": {
      const a = d?.picks;
      if (!Array.isArray(a) || a.length !== spec.pairs.length || !a.every((x) => x === 0 || x === 1)) return "Pick one in every pair.";
      return null;
    }
    case "madlibs": {
      const a = d?.words;
      if (!Array.isArray(a) || a.length !== spec.slots.length || !a.every((x) => str(x, 40))) return "Fill in every blank.";
      return null;
    }
    case "speed": {
      const a = d?.answers;
      if (!Array.isArray(a) || a.length !== spec.questions.length || !a.every((x) => typeof x === "string" && x.length <= 80)) return "Something went wrong with the round.";
      if (a.filter((x) => (x as string).trim()).length < 3) return "Time's up with fewer than three answers. Try it again.";
      return null;
    }
    case "twotruths": {
      const s = d?.statements;
      const lie = d?.lie;
      if (!Array.isArray(s) || s.length !== 3 || !s.every((x) => str(x, 160))) return "Three statements, all filled in.";
      if (![0, 1, 2].includes(lie as number)) return "Tell us which one's the lie. Only you will know.";
      return null;
    }
    case "video":
      return null;
  }
}

// What a play answer looks like on the page.
export function compile(spec: PlaySpec, data: Record<string, unknown>): { title?: string; lines: string[]; score?: string } {
  switch (spec.kind) {
    case "survey": {
      const a = data.answers as boolean[];
      const yes = spec.questions.filter((_, i) => a[i]);
      const no = spec.questions.filter((_, i) => !a[i]);
      return {
        title: spec.title,
        score: `${yes.length} / ${spec.questions.length}`,
        lines: [...yes.map((q) => `✓ ${q}`), ...no.map((q) => `✗ ${q}`)],
      };
    }
    case "thisorthat": {
      const p = data.picks as number[];
      return { lines: spec.pairs.map(([a, b], i) => (p[i] === 0 ? a : b)) };
    }
    case "madlibs": {
      const w = data.words as string[];
      return { lines: [spec.template.replace(/\{(\d+)\}/g, (_, i) => w[Number(i)] ?? "")] };
    }
    case "speed": {
      const a = data.answers as string[];
      return { lines: spec.questions.map((q, i) => `${q}: ${a[i]?.trim() || "(ran out of time)"}`) };
    }
    case "twotruths": {
      const s = data.statements as string[];
      return { lines: s };
    }
    case "video":
      return { lines: [] };
  }
}
