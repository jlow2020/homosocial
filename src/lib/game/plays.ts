// Mixed-media drops. The engine alternates these with text formats so the
// game changes shape every week, not just its wording. Never rename an id:
// used ones are remembered by id so nobody plays the same one twice.

export type PlayMode = "survey" | "thisorthat" | "madlibs" | "speed" | "twotruths" | "video";

export type SurveySpec = { kind: "survey"; questions: string[]; title: string; census: boolean };
export type ThisOrThatSpec = { kind: "thisorthat"; pairs: [string, string][]; reveal: boolean };
export type MadLibsSpec = { kind: "madlibs"; slots: string[]; template: string }; // template uses {0} {1} ...
export type SpeedSpec = { kind: "speed"; questions: string[]; seconds: number };
export type TwoTruthsSpec = { kind: "twotruths" };
export type VideoSpec = { kind: "video"; seconds: number };
export type PlaySpec = SurveySpec | ThisOrThatSpec | MadLibsSpec | SpeedSpec | TwoTruthsSpec | VideoSpec;

export type Play = {
  id: string;
  weeks: number[];
  heat: number;
  mode: PlayMode;
  body: string;
  hint?: string;
  spec: PlaySpec;
};

export const PLAYS: Play[] = [
  // Surveys: ten quick answers compile into his card for the week. Census shows the Circle's totals.
  {
    id: "survey-scandal",
    weeks: [2, 4, 5],
    heat: 4,
    mode: "survey",
    body: "The Scandalous Survey. Ten questions, yes or no, no explaining yourself.",
    hint: "Your answers become your card for the week. The Circle's totals get posted too.",
    spec: {
      kind: "survey",
      title: "Scandal score",
      census: true,
      questions: [
        "Hooked up with a coworker",
        "Hooked up in a car",
        "Sent a nude to the wrong person",
        "Faked it",
        "Been to a bathhouse",
        "Slept with a friend's ex",
        "Had a threesome",
        "Lied about your age on an app",
        "Hooked up on a first date",
        "Kissed a straight guy who said he wasn't",
      ],
    },
  },
  {
    id: "survey-bedroom",
    weeks: [3, 5],
    heat: 4,
    mode: "survey",
    body: "The Bedroom Survey. Yes or no. Nobody's checking, but we'll know.",
    hint: "Your answers become your card. Totals get posted.",
    spec: {
      kind: "survey",
      title: "Bedroom report",
      census: true,
      questions: [
        "Lights on",
        "Music on",
        "Talks during",
        "Stays the night",
        "Makes breakfast",
        "Owns more than one toy",
        "Has a side of the bed and will fight for it",
        "Has cried after",
        "Has laughed during",
        "Showers after, every time",
      ],
    },
  },
  {
    id: "survey-dating",
    weeks: [1, 2, 5],
    heat: 2,
    mode: "survey",
    body: "The Dating Survey. Ten yes or nos. Your card does the talking.",
    spec: {
      kind: "survey",
      title: "Dating profile, involuntary",
      census: true,
      questions: [
        "Texts first",
        "Double texts",
        "Has ghosted someone this year",
        "Has been ghosted this year",
        "Would date a bartender",
        "Would date a coworker",
        "Has a type and knows it's a problem",
        "Pays on the first date",
        "Kisses on the first date",
        "Has said 'I love you' first",
      ],
    },
  },
  {
    id: "survey-florida",
    weeks: [1, 6],
    heat: 2,
    mode: "survey",
    body: "The Florida Survey. Yes or no. This state did this to you.",
    spec: {
      kind: "survey",
      title: "Florida man score",
      census: true,
      questions: [
        "Been on a boat you didn't own",
        "Seen a gator on a date",
        "Hooked up on a beach",
        "Sunburned somewhere embarrassing",
        "Been to a Jimmy Buffett concert",
        "Had a Pub Sub for dinner three days running",
        "Evacuated for a hurricane",
        "Ignored an evacuation for a hurricane",
        "Been on a Key West bar crawl",
        "Owns more than four Hawaiian shirts",
      ],
    },
  },

  // This or That: one tap each. The splits get posted, and you see who agreed with you.
  {
    id: "tot-bedroom",
    weeks: [2, 3, 5],
    heat: 4,
    mode: "thisorthat",
    body: "This or That, bedroom edition. Fifteen pairs. No thinking.",
    hint: "The Circle's splits get posted. You'll see who agreed with you most.",
    spec: {
      kind: "thisorthat",
      reveal: false,
      pairs: [
        ["Morning", "Night"],
        ["Lights on", "Lights off"],
        ["Shower", "Bed"],
        ["His place", "Yours"],
        ["Slow", "Fast"],
        ["Talking", "Silent"],
        ["Briefs", "Nothing"],
        ["Top bunk", "Bottom bunk"],
        ["Cuddle after", "Uber after"],
        ["Kiss first", "Skip to it"],
        ["Neck", "Thighs"],
        ["Hotel", "Tent"],
        ["Hands", "Mouth"],
        ["Text after", "Wait for him"],
        ["Planned", "Spontaneous"],
      ],
    },
  },
  {
    id: "tot-gay",
    weeks: [1, 2, 6],
    heat: 2,
    mode: "thisorthat",
    body: "This or That, gay edition. Fifteen pairs, one tap each.",
    hint: "The Circle's splits get posted. You'll see who agreed with you most.",
    spec: {
      kind: "thisorthat",
      reveal: false,
      pairs: [
        ["Gaga", "Beyoncé"],
        ["Brunch", "Dinner"],
        ["Beach", "Pool"],
        ["Drag brunch", "Drag show"],
        ["Twink", "Daddy"],
        ["Sarasota", "St. Pete"],
        ["Key West", "Miami"],
        ["Grindr", "Hinge"],
        ["Gym at 6am", "Gym at 9pm"],
        ["Tequila", "Vodka"],
        ["Housewives", "Drag Race"],
        ["Cats", "Dogs"],
        ["Cher", "Dolly"],
        ["Tank top", "Button-up"],
        ["Big wedding", "Courthouse"],
      ],
    },
  },
  {
    id: "wyr-1",
    weeks: [2, 4, 5],
    heat: 4,
    mode: "thisorthat",
    body: "Would You Rather. Two awful options, one tap. Then everyone sees who picked what.",
    spec: {
      kind: "thisorthat",
      reveal: true,
      pairs: [
        ["Your mom reads your DMs", "Your boss sees your camera roll"],
        ["Never hook up again", "Only hook up in public"],
        ["Date your ex's best friend", "Date your best friend's ex"],
        ["Lose your sense of taste", "Lose your sense of touch"],
        ["Everyone knows your body count", "Everyone knows your search history"],
      ],
    },
  },
  {
    id: "wyr-2",
    weeks: [3, 4, 6],
    heat: 3,
    mode: "thisorthat",
    body: "Would You Rather, round two. Everyone sees who picked what.",
    spec: {
      kind: "thisorthat",
      reveal: true,
      pairs: [
        ["Only date younger", "Only date older"],
        ["Be the hot one", "Be the funny one"],
        ["Run into your ex at Publix", "Run into your ex at the gym"],
        ["Be caught by his roommate", "Be caught by your roommate"],
        ["Rich and boring", "Broke and unforgettable"],
      ],
    },
  },

  // Mad Libs: seven words in, one filthy story out. The story is his answer.
  {
    id: "madlibs-date",
    weeks: [2, 3, 5],
    heat: 3,
    mode: "madlibs",
    body: "Mad Libs: the date. Give us seven words. We write the night.",
    hint: "Your filled-in story is your answer for the week.",
    spec: {
      kind: "madlibs",
      slots: ["a body part", "something sold at Publix", "an ex's first name", "a verb ending in -ing", "a place in Florida", "an adjective", "a number"],
      template:
        "He showed up to the date with incredible {0}s and a bag from Publix with nothing in it but {1}. I said my name was {2} because I panicked. By 10pm we were {3} in the parking lot of {4}. It was {5}. I've seen him {6} times since and I still haven't told him my real name.",
    },
  },
  {
    id: "madlibs-morning",
    weeks: [3, 4, 6],
    heat: 4,
    mode: "madlibs",
    body: "Mad Libs: the morning after. Seven words. Don't overthink it.",
    hint: "Your filled-in story is your answer for the week.",
    spec: {
      kind: "madlibs",
      slots: ["a body part", "a breakfast food", "a celebrity", "a verb", "an article of clothing", "a feeling", "a Florida town"],
      template:
        "I woke up with his {0} on my face and the smell of {1} coming from the kitchen. He looked like {2} if {2} could {3}. I couldn't find my {4} anywhere. I felt {5}. Then I remembered we were in {6} and neither of us lives there.",
    },
  },

  // Speed Round: ten questions, sixty seconds, no edits. Posted raw.
  {
    id: "speed-1",
    weeks: [1, 2, 5],
    heat: 3,
    mode: "speed",
    body: "Speed Round. Ten questions, sixty seconds, no editing. Whatever you type is what the Circle sees.",
    spec: {
      kind: "speed",
      seconds: 60,
      questions: ["Celebrity crush", "Worst date, two words", "Best body part on a man", "Your type in one word", "Last text you sent", "Guilty pleasure song", "Deal breaker", "First kiss, where", "Go-to drink", "Something you'd never admit sober"],
    },
  },
  {
    id: "speed-2",
    weeks: [4, 5, 6],
    heat: 4,
    mode: "speed",
    body: "Speed Round, dirty edition. Ten questions, sixty seconds, no editing.",
    spec: {
      kind: "speed",
      seconds: 60,
      questions: ["Lights on or off", "Weirdest place", "Best kisser you've had, first name", "Longest dry spell", "Shortest relationship", "Something that always works on you", "Something that never works on you", "Underwear right now", "Last time you said no", "Last time you should have"],
    },
  },

  // Two Truths and a Lie. The Circle votes the lie. Reveal when the week ends.
  {
    id: "twotruths-1",
    weeks: [1, 3, 4],
    heat: 3,
    mode: "twotruths",
    body: "Two Truths and a Lie. Make them filthy, make them close. The Circle votes. Names and answers come out when the week ends.",
    spec: { kind: "twotruths" },
  },
  {
    id: "twotruths-exes",
    weeks: [4, 5],
    heat: 4,
    mode: "twotruths",
    body: "Two Truths and a Lie, exes edition. Three things about guys you've dated. One's made up.",
    spec: { kind: "twotruths" },
  },

  // Video: fifteen seconds, straight to camera.
  {
    id: "video-type",
    weeks: [5],
    heat: 3,
    mode: "video",
    body: "Fifteen seconds, straight to camera: your type, in one breath.",
    hint: "One take. No filters. Underwear yes, explicit no.",
    spec: { kind: "video", seconds: 15 },
  },
  {
    id: "video-lastdate",
    weeks: [4, 6],
    heat: 3,
    mode: "video",
    body: "Fifteen seconds: your impression of your last date. Be fair. Be mean.",
    spec: { kind: "video", seconds: 15 },
  },
  {
    id: "video-tour",
    weeks: [3],
    heat: 3,
    mode: "video",
    body: "Ten Second Tour. One room, one take. Rules: no cleaning first.",
    hint: "The bedroom counts double.",
    spec: { kind: "video", seconds: 15 },
  },
  {
    id: "video-teach",
    weeks: [6],
    heat: 2,
    mode: "video",
    body: "Teach us one thing in fifteen seconds. Anything you're good at.",
    hint: "Useful after midnight gets bonus points.",
    spec: { kind: "video", seconds: 15 },
  },
  {
    id: "video-voice",
    weeks: [5, 6],
    heat: 4,
    mode: "video",
    body: "Your sexy voice. You know you have one. Fifteen seconds, camera optional, voice required.",
    hint: "Point it at the ceiling if you're shy.",
    spec: { kind: "video", seconds: 15 },
  },
];

export const PLAY_BY_ID = new Map(PLAYS.map((p) => [p.id, p]));
export const PLAY_MODES: PlayMode[] = ["survey", "thisorthat", "madlibs", "speed", "twotruths", "video"];
