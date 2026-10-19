// The profile builder's steps, shared by the server pages and the builder itself.
export const STEP_KEYS = ["into", "down", "prompts", "photos", "voice", "details", "hit"] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export const STEP_TITLES: Record<StepKey, string> = { into: "Into", down: "Down for", prompts: "Prompts", photos: "Photos", voice: "Say hi", details: "Details", hit: "Greatest Hit" };
