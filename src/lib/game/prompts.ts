// The drop bank. Every Season has the same shape, but no guy ever gets the
// same prompt twice. Add new prompts anywhere; ids must never change or be reused.
//
// House style: juicy, a little filthy, never explicit. Everyone here is a
// verified adult, so we flirt like adults. Public photos: underwear yes,
// explicit no. Explicit photos only in DMs, once both guys turn photos on.
// anon: answers show without names or faces. Use it for the confessions
// nobody would sign with their real face.

export type PromptKind = "text" | "photo";
export type Mode =
  | "text" | "photo" | "anon" | "guesswho" | "dare"
  | "survey" | "thisorthat" | "madlibs" | "speed" | "twotruths" | "video"
  | "caption" | "rank" | "owner" | "chain" | "hotseat" | "voice" | "blinddate" | "ranknight";

export type Prompt = {
  id: string;
  week: number;
  kind: PromptKind;
  body: string;
  hint?: string;
  anon?: boolean;
  heat?: number; // 1 tame, 5 filthy
};

export function modeOf(p: { kind: PromptKind; anon?: boolean }): Mode {
  return p.anon ? "anon" : p.kind;
}

export const PROMPTS: Prompt[] = [
  // Week 1: Arrivals. First impressions, first flirts.
  { id: "w1-honestbio", week: 1, kind: "text", body: "Your dating app bio if it had to be 100% honest. No \"love to travel.\" The truth.", heat: 2 },
  { id: "w1-rizz", week: 1, kind: "text", body: "Rate your own rizz out of 10. Then show us: what's your opening line?", heat: 2 },
  { id: "w1-redflag", week: 1, kind: "text", body: "Your biggest red flag, pitched like it's a turn-on.", heat: 2 },
  { id: "w1-exes", week: 1, kind: "text", body: "What would your exes say you're like in a relationship? What would they say you're like in bed? Answer one. We'll notice which one you dodged.", heat: 3 },
  { id: "w1-unhinged", week: 1, kind: "photo", body: "The most unhinged message you've ever gotten on an app. Screenshot it.", hint: "Blur the name and face. We want the message, not the man.", heat: 3 },
  { id: "w1-secondlook", week: 1, kind: "photo", body: "Post the photo you'd use to get a second look.", hint: "Faces welcome. Underwear yes. Explicit no. Save that for the DMs.", heat: 3 },
  { id: "w1-florida", week: 1, kind: "text", body: "The most Florida thing that's ever happened to you on a date.", heat: 1 },

  // Week 2: Hot Takes. Pick a side and defend it.
  { id: "w2-open", week: 2, kind: "text", body: "Settle it: open relationships. The future, or a group project nobody wants to finish?", heat: 3 },
  { id: "w2-bodycount", week: 2, kind: "text", body: "Body count: does it matter? Answer with your chest, not your number.", heat: 4 },
  { id: "w2-unsolicited", week: 2, kind: "text", body: "Unsolicited pics: art form or hate crime? Make your case.", heat: 4 },
  { id: "w2-tribes", week: 2, kind: "text", body: "Bears, otters, twinks, jocks, daddies. Rank them. Brave answers only.", heat: 3 },
  { id: "w2-cheating", week: 2, kind: "text", body: "\"It's not cheating if...\" Finish the sentence with the one that actually starts fights.", heat: 3 },
  { id: "w2-check", week: 2, kind: "text", body: "First date: split it, he pays, or whoever's hotter pays? Defend it.", heat: 1 },
  { id: "w2-morningafter", week: 2, kind: "text", body: "The morning after: brunch together, or \"I'll call you an Uber\"? There's a right answer.", heat: 3 },
  { id: "w2-drunk", week: 2, kind: "text", body: "The opinion about sex you'd only say three drinks in.", anon: true, heat: 4 },
  { id: "w2-gym", week: 2, kind: "text", body: "Gym bathroom mirror selfies: crime or community service? Sentence the defendant.", heat: 2 },

  // Week 3: Show and Tell. Photos, and the stories behind them.
  { id: "w3-comeover", week: 3, kind: "text", body: "Your go-to \"come over\" move. Candles? A playlist? A suspiciously clean apartment? Walk us through it.", heat: 3 },
  { id: "w3-thirst", week: 3, kind: "photo", body: "Thirst trap time. Your best one.", hint: "Underwear yes. Explicit no. Make us work for it.", heat: 3 },
  { id: "w3-nightstand", week: 3, kind: "photo", body: "Open your nightstand drawer. Photo.", hint: "Blur what you need to. We'll respect the blur. We'll also wonder about the blur.", heat: 4 },
  { id: "w3-stayover", week: 3, kind: "photo", body: "The outfit you wear when you're hoping he stays over.", heat: 3 },
  { id: "w3-fridge", week: 3, kind: "photo", body: "Show us your fridge. A man's fridge tells you if he'll make you breakfast.", heat: 1 },
  { id: "w3-obvious", week: 3, kind: "photo", body: "The photo where it was obvious. A kid pic, prom, that one Halloween costume.", heat: 1 },
  { id: "w3-screentime", week: 3, kind: "photo", body: "Screenshot your screen time. Explain the app at the top. We know what it is.", heat: 2 },
  { id: "w3-underwear", week: 3, kind: "text", body: "Your lucky underwear. Describe it, its record, and its next assignment.", heat: 3 },

  // Week 4: Confessions. Anonymous, mostly, because you'll need it.
  { id: "w4-public", week: 4, kind: "text", body: "The most public place you've ever hooked up. We're not judging. We're absolutely judging.", anon: true, heat: 4 },
  { id: "w4-thatnight", week: 4, kind: "text", body: "The hookup you still think about. Not the guy. The night.", anon: true, heat: 4 },
  { id: "w4-bedroomfail", week: 4, kind: "text", body: "Your most embarrassing moment in the bedroom. It happened, it's funny now, tell it.", anon: true, heat: 4 },
  { id: "w4-straight", week: 4, kind: "text", body: "Ever hooked up with a \"straight\" guy? On a scale of 1 to Kinsey, how straight was he?", anon: true, heat: 4 },
  { id: "w4-caught", week: 4, kind: "text", body: "Ever been caught? By who, doing what, and how did you explain it?", anon: true, heat: 4 },
  { id: "w4-deny", week: 4, kind: "text", body: "Something you've done that you'd deny under oath if your mother asked.", anon: true, heat: 3 },
  { id: "w4-attention", week: 4, kind: "text", body: "The craziest thing you've ever done to get a guy's attention. Did it work?", heat: 3 },
  { id: "w4-firstdatelie", week: 4, kind: "text", body: "The lie you told on a first date that you're still keeping up.", heat: 2 },
  { id: "w4-knew", week: 4, kind: "text", body: "When did you know? Not when you came out. When you knew.", heat: 1 },

  // Week 5: Type. What gets you stupid.
  { id: "w5-publix", week: 5, kind: "text", body: "Describe your type using only things sold at Publix.", heat: 2 },
  { id: "w5-stupid", week: 5, kind: "text", body: "What makes you stupid for a guy? \"Forearms\" isn't specific enough. Try again.", heat: 3 },
  { id: "w5-position", week: 5, kind: "text", body: "Top, bottom, vers, or \"depends on his shoulders\"? Defend your answer.", heat: 4 },
  { id: "w5-nonphysical", week: 5, kind: "text", body: "The non-physical thing that's an instant turn-on. Be uncomfortably specific.", heat: 2 },
  { id: "w5-zillow", week: 5, kind: "text", body: "Your type, written as a Zillow listing.", hint: "\"Charming fixer-upper, emotionally. Great bones.\"", heat: 2 },
  { id: "w5-kiss", week: 5, kind: "text", body: "Rate your kissing out of 10. Bring evidence. Witnesses accepted.", heat: 3 },
  { id: "w5-weird", week: 5, kind: "text", body: "The weirdest place you've ever caught feelings. Jury duty? The DMV? Church?", heat: 2 },
  { id: "w5-hm", week: 5, kind: "text", body: "Whose answers in this Circle made you go \"hm\" so far? No names required. Hints encouraged.", heat: 3 },
  { id: "w5-perfectdate", week: 5, kind: "text", body: "The perfect first date, start to finish. \"Finish\" is doing a lot of work in that sentence.", heat: 4 },

  // Week 6: Out. Get off your phone. Mostly.
  { id: "w6-hundred", week: 6, kind: "text", body: "The Circle has $100 and one Saturday night. Pitch the plan. The winner goes in Plans.", heat: 1 },
  { id: "w6-baddecisions", week: 6, kind: "text", body: "The bar around here where you've made your worst decisions. Recommend it anyway.", heat: 3 },
  { id: "w6-shootshot", week: 6, kind: "text", body: "Sidequest: give your number to a stranger this week. Or to someone in this Circle. Report back.", heat: 3 },
  { id: "w6-irl", week: 6, kind: "text", body: "Your best place to meet guys that isn't an app. The Publix produce section counts.", heat: 2 },
  { id: "w6-teach", week: 6, kind: "text", body: "One thing every man should know how to do. Bonus points if it's useful after midnight.", heat: 2 },
  { id: "w6-sidequest", week: 6, kind: "photo", body: "Sidequest: a photo with a pelican, a drag queen or a stranger's dog by Sunday. All three and you're a legend.", heat: 1 },

  // Week 7: Roses. Still kind. Just flirtier.
  { id: "w7-award", week: 7, kind: "text", body: "Hand out an award to someone in this Circle. Make it specific.", heat: 1 },
  { id: "w7-underrated", week: 7, kind: "text", body: "The most underrated hot guy in this Circle. Make him blush.", heat: 3 },
  { id: "w7-lastweek", week: 7, kind: "text", body: "If this were the last week on Earth, who in here are you taking to dinner? No strings. Probably.", heat: 3 },
  { id: "w7-jail", week: 7, kind: "text", body: "Who in this Circle would you call from jail? He'd come. He'd also tell everyone.", heat: 1 },
  { id: "w7-firstlook", week: 7, kind: "text", body: "Whose answer did you look for first every Monday?", heat: 2 },

  // Week 8: The Finale.
  { id: "w8-lights", week: 8, kind: "text", body: "One thing you want this Circle to know before the lights come up.", heat: 1 },
  { id: "w8-almostdm", week: 8, kind: "text", body: "The DM you almost sent this Season. Paste it. Don't say who it was for.", anon: true, heat: 4 },
  { id: "w8-braver", week: 8, kind: "text", body: "Who would you have shot your shot with if you'd been braver in Week 1?", anon: true, heat: 3 },
  { id: "w8-fiveyears", week: 8, kind: "text", body: "Predict where three guys in this Circle will be in five years. Be generous. Be specific. Be a little mean.", heat: 2 },
];

export const PROMPT_BY_ID = new Map(PROMPTS.map((p) => [p.id, p]));
