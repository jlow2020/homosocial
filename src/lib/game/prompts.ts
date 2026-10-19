// The drop bank. Every Season has the same shape, but no guy ever gets the
// same prompt twice. Add new prompts anywhere; ids must never change or be reused.

export type PromptKind = "text" | "photo";

export type Prompt = {
  id: string;
  week: number;
  kind: PromptKind;
  body: string;
  hint?: string;
};

export const PROMPTS: Prompt[] = [
  // Week 1: Arrivals
  { id: "w1-villa", week: 1, kind: "text", body: "You're walking into the villa. What song is playing, what are you wearing, and what's your first line?" },
  { id: "w1-groupchat", week: 1, kind: "text", body: "Your reputation in your current group chat, in one sentence. Then tell us if it's fair." },
  { id: "w1-redflag", week: 1, kind: "text", body: "Your red flag, pitched like a selling point." },
  { id: "w1-florida", week: 1, kind: "text", body: "The most Florida thing that has ever happened to you." },
  { id: "w1-firstbio", week: 1, kind: "text", body: "Recite your first dating app bio from memory.", hint: "Can't remember it? Write the worst one you can." },
  { id: "w1-threewords", week: 1, kind: "text", body: "Three words your mom uses to describe you. Three your ex uses." },
  { id: "w1-roll", week: 1, kind: "photo", body: "Post the 7th photo in your camera roll. No skipping. Explain.", hint: "Nothing explicit. If #7 is a problem, take #8 and tell us why." },

  // Week 2: Hot Takes
  { id: "w2-overrated", week: 2, kind: "text", body: "Name a gay icon who's overrated. You have until the Circle finds you." },
  { id: "w2-brunch", week: 2, kind: "text", body: "Brunch is a scam. Defend it or destroy it." },
  { id: "w2-rank-eats", week: 2, kind: "text", body: "Rank them: Pub Sub, a gas station Cuban, airport Chili's, Waffle House at 3am." },
  { id: "w2-diva-move", week: 2, kind: "text", body: "Which diva helps you move apartments, and which one steals your couch?" },
  { id: "w2-lipsync", week: 2, kind: "text", body: "The lip sync you'd still fight someone over." },
  { id: "w2-pretend", week: 2, kind: "text", body: "The thing every gay pretends to like that you're done pretending about." },
  { id: "w2-vers", week: 2, kind: "text", body: "Settle it: is \"vers\" a personality or a cop-out?" },
  { id: "w2-hill", week: 2, kind: "text", body: "The hill you'll die on that nobody in this Circle will agree with." },

  // Week 3: Show and Tell
  { id: "w3-story", week: 3, kind: "text", body: "One thing in your home with a story behind it. Tell the story." },
  { id: "w3-fridge", week: 3, kind: "photo", body: "Open your fridge. Photo. No tidying first. We will know." },
  { id: "w3-obvious", week: 3, kind: "photo", body: "The photo where it was obvious. A kid pic, prom, that one Halloween costume." },
  { id: "w3-screentime", week: 3, kind: "photo", body: "Screenshot your screen time. Explain yourself." },
  { id: "w3-drawer", week: 3, kind: "photo", body: "Your most chaotic drawer. Photo, no edits." },
  { id: "w3-tattoo", week: 3, kind: "text", body: "Your worst tattoo, or the one you'd get if you lost a bet tonight." },
  { id: "w3-view", week: 3, kind: "photo", body: "The view from exactly where you're sitting right now." },

  // Week 4: Confessions
  { id: "w4-firstdatelie", week: 4, kind: "text", body: "The lie you told on a first date that you're still keeping up." },
  { id: "w4-petty", week: 4, kind: "text", body: "The pettiest thing you've ever done to an ex." },
  { id: "w4-knew", week: 4, kind: "text", body: "When did you know? Not when you came out. When you knew." },
  { id: "w4-didntdeserve", week: 4, kind: "text", body: "The most you ever did for a guy who didn't deserve it." },
  { id: "w4-straightfriends", week: 4, kind: "text", body: "Something you've never told your straight friends." },
  { id: "w4-caught", week: 4, kind: "text", body: "The worst place you've ever been caught making out." },
  { id: "w4-gotaway", week: 4, kind: "text", body: "Tell us about the one that got away. Make us hate him." },

  // Week 5: Type
  { id: "w5-publix", week: 5, kind: "text", body: "Describe your type using only things sold at Publix." },
  { id: "w5-zillow", week: 5, kind: "text", body: "Your type, written as a Zillow listing.", hint: "\"Charming fixer-upper, emotionally.\"" },
  { id: "w5-stupid", week: 5, kind: "text", body: "What makes you stupid for a guy? \"Forearms\" isn't specific enough. Try again." },
  { id: "w5-crush", week: 5, kind: "text", body: "Your most embarrassing celebrity crush. Walk us through the logic." },
  { id: "w5-pickup", week: 5, kind: "text", body: "The pickup line that actually worked on you. Unfortunately." },
  { id: "w5-kiss", week: 5, kind: "text", body: "Rate your kissing out of 10. Bring evidence." },
  { id: "w5-firstdate", week: 5, kind: "text", body: "Plan a first date in your city for $40. Be specific." },

  // Week 6: Out
  { id: "w6-hundred", week: 6, kind: "text", body: "The Circle has $100 and one Saturday. Pitch the plan. Post the winner in Plans." },
  { id: "w6-teach", week: 6, kind: "text", body: "Teach us something in 60 seconds. Anything you're good at." },
  { id: "w6-errand", week: 6, kind: "text", body: "Run your usual Saturday errand with someone from the Circle. Report back." },
  { id: "w6-sidequest", week: 6, kind: "photo", body: "Sidequest: a photo with a pelican, a drag queen or a stranger's dog by Sunday. All three and you're a legend." },
  { id: "w6-local", week: 6, kind: "text", body: "Your most underrated spot within 20 minutes of here. Sell it." },

  // Week 7: Roses
  { id: "w7-award", week: 7, kind: "text", body: "Hand out an award to someone in this Circle. Make it specific." },
  { id: "w7-firstlook", week: 7, kind: "text", body: "Whose answer did you look for first every week?" },
  { id: "w7-jail", week: 7, kind: "text", body: "Who in this Circle would you call from jail? He'd come. He'd also tell everyone." },
  { id: "w7-changedmind", week: 7, kind: "text", body: "Who changed your mind about something this Season?" },

  // Week 8: The Finale
  { id: "w8-lights", week: 8, kind: "text", body: "One thing you want this Circle to know before the lights come up." },
  { id: "w8-fiveyears", week: 8, kind: "text", body: "Predict where three guys in this Circle will be in five years. Be generous. Be specific." },
  { id: "w8-moment", week: 8, kind: "text", body: "Reunion special: the best moment of the Season." },
];

export const PROMPT_BY_ID = new Map(PROMPTS.map((p) => [p.id, p]));
