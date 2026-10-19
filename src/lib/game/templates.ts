// Layer 3 of the drop engine: formats with one slot each. A format is a joke
// that already works; the plug-ins supply the heat. Dozens of formats times
// dozens of plug-ins means thousands of drops that each read as written.
// Never rename a format or plug-in id: used ones are remembered by id.

import type { Mode } from "./prompts";

export type Plug = { id: string; text: string; heat: number };
export type Format = {
  id: string;
  weeks: number[];
  mode: Mode;
  heat: number; // the format's own floor; final heat = max(format, plug)
  render: (plug: string) => string;
  hint?: string;
  plugs: Plug[];
};

const p = (id: string, text: string, heat: number): Plug => ({ id, text, heat });

export const FORMATS: Format[] = [
  {
    id: "defend",
    weeks: [2, 5],
    mode: "text",
    heat: 2,
    render: (x) => `Defend the indefensible. You've been assigned: "${x}" Go.`,
    hint: "You don't have to believe it. You have to sell it.",
    plugs: [
      p("ranch", "Ranch is a personality.", 1),
      p("vers-lie", "Nobody is actually vers.", 3),
      p("first-date-sex", "Sex on the first date is the only honest first date.", 4),
      p("body-count", "A low body count is a red flag.", 4),
      p("underwear", "Boxers are a cry for help.", 2),
      p("brunch", "Brunch is a scam.", 1),
      p("age-gap", "Age gaps are hotter than age matches.", 3),
      p("gym-selfie", "Gym mirror selfies are a public service.", 2),
      p("ghosting", "Ghosting is kinder than the talk.", 2),
      p("morning", "Morning sex is better than night sex and the night people are lying.", 4),
      p("topless", "If it's over 80 degrees, shirts are optional at brunch.", 2),
      p("exes", "Staying friends with your ex is a kink.", 3),
    ],
  },
  {
    id: "rank",
    weeks: [2, 3, 5],
    mode: "text",
    heat: 2,
    render: (x) => `Rank them. Brave answers only: ${x}`,
    plugs: [
      p("tribes", "bears, otters, twinks, jocks, daddies.", 3),
      p("eats", "Pub Sub, a gas station Cuban, airport Chili's, Waffle House at 3am.", 1),
      p("spots", "shower, kitchen counter, car, beach, his roommate's couch.", 4),
      p("kisses", "forehead kiss, neck kiss, the kiss that means he's staying, the kiss that means he's leaving.", 3),
      p("compliments", "\"you're cute,\" \"you're hot,\" \"you're trouble,\" \"you're mine.\"", 3),
      p("divas", "Gaga, Beyoncé, Kylie, Cher, Chappell. One steals your man. One steals your couch.", 1),
      p("texts", "\"wyd,\" \"u up,\" \"come over,\" \"good morning 😏\"", 3),
      p("bodies", "forearms, shoulders, hands, thighs, the back of the neck.", 3),
      p("underwear", "briefs, boxer briefs, jock, trunks, nothing.", 3),
      p("florida", "Siesta Key, Miami, Key West, Orlando, Gainesville. As a date.", 1),
    ],
  },
  {
    id: "finish",
    weeks: [2, 4, 5],
    mode: "text",
    heat: 3,
    render: (x) => `Finish the sentence. The one that starts fights: "${x}..."`,
    plugs: [
      p("cheating", "It's not cheating if", 3),
      p("type", "He's not my type unless", 2),
      p("dealbreaker", "I'll overlook anything except", 2),
      p("bed", "The fastest way to get kicked out of my bed is", 4),
      p("stay", "I knew he was staying over when", 3),
      p("florida-man", "Only in Florida would I", 2),
      p("secret", "My friends don't know that I", 3),
      p("turnon", "It shouldn't turn me on, but", 4),
      p("after", "The morning after, I always", 3),
    ],
  },
  {
    id: "rewrite",
    weeks: [1, 5],
    mode: "text",
    heat: 2,
    render: (x) => `Your type, written as ${x}.`,
    plugs: [
      p("zillow", "a Zillow listing. \"Charming fixer-upper, emotionally. Great bones.\"", 2),
      p("yelp", "a one-star Yelp review you keep going back to", 2),
      p("horoscope", "a horoscope. \"Expect a tall stranger. Expect disappointment. Expect him again Thursday.\"", 2),
      p("weather", "a Florida weather alert", 2),
      p("recipe", "a recipe. Ingredients, time, and what happens if you overcook him", 3),
      p("obituary", "an obituary for your sex life after you met him", 4),
      p("menu", "a Publix deli order", 2),
      p("warning", "a warning label", 3),
    ],
  },
  {
    id: "confess",
    weeks: [4, 8],
    mode: "anon",
    heat: 4,
    render: (x) => x,
    hint: "Anonymous. Nobody in the Circle sees who wrote what.",
    plugs: [
      p("public", "The most public place you've ever hooked up.", 4),
      p("thatnight", "The hookup you still think about. Not the guy. The night.", 4),
      p("fail", "Your most embarrassing moment in the bedroom. It's funny now. Tell it.", 4),
      p("straight", "Ever hooked up with a \"straight\" guy? On a scale of 1 to Kinsey, how straight was he?", 4),
      p("caught", "Ever been caught? By who, doing what, and how did you explain it?", 4),
      p("deny", "Something you've done that you'd deny under oath if your mother asked.", 3),
      p("attention", "The craziest thing you've done to get a guy's attention. Did it work?", 3),
      p("lie", "The lie you told on a first date that you're still keeping up.", 2),
      p("fantasy", "The fantasy you've never said out loud. Say it here.", 5),
      p("worst", "The worst sex you've ever had, in three words. Then the story.", 4),
      p("regret", "The one you shouldn't have slept with. Why you did anyway.", 4),
      p("circle", "Someone in this Circle you've thought about. No names. A hint is fine.", 4),
    ],
  },
  {
    id: "guesswho",
    weeks: [4, 6],
    mode: "guesswho",
    heat: 4,
    render: (x) => x,
    hint: "Anonymous. Then the Circle guesses who wrote what. Names revealed when the week ends.",
    plugs: [
      p("public", "The most public place you've ever hooked up.", 4),
      p("kink", "The kink you'd admit to on a third date.", 5),
      p("celeb", "The celebrity you'd blow up your life for. Walk us through the logic.", 2),
      p("lie", "The lie you told on a first date that you're still keeping up.", 2),
      p("worst", "The worst place you've ever woken up.", 3),
      p("toy", "The thing in your nightstand you'd hide if your mom came over.", 4),
      p("ex", "The pettiest thing you've done to an ex.", 2),
      p("text", "The last text you sent that you'd die if the Circle read. Paste it.", 4),
    ],
  },
  {
    id: "photo",
    weeks: [3],
    mode: "photo",
    heat: 3,
    render: (x) => x,
    hint: "Underwear yes. Explicit no. Make us work for it.",
    plugs: [
      p("thirst", "Thirst trap time. Your best one.", 3),
      p("stayover", "The outfit you wear when you're hoping he stays over.", 3),
      p("nightstand", "Open your nightstand drawer. Photo. Blur what you need to. We'll wonder about the blur.", 4),
      p("fridge", "Your fridge. A man's fridge tells you if he'll make you breakfast.", 1),
      p("bed", "Your bed, right now, no making it first.", 3),
      p("mirror", "Gym mirror selfie, the one you didn't post.", 3),
      p("obvious", "The photo where it was obvious. Kid pic, prom, that one Halloween costume.", 1),
      p("screentime", "Screenshot your screen time. Explain the app at the top. We know what it is.", 2),
      p("shower", "Your shower. The products tell a story.", 2),
    ],
  },
  {
    id: "roulette",
    weeks: [1, 3, 6],
    mode: "photo",
    heat: 3,
    render: (x) => `Camera Roll Roulette. Post photo number ${x} from your camera roll. No skipping.`,
    hint: "If it's a problem, post the next one and tell us why. Explicit stays in the roll.",
    plugs: [p("7", "7", 3), p("23", "23", 3), p("47", "47", 3), p("69", "69", 4), p("100", "100", 3), p("13", "13", 3), p("31", "31", 3), p("88", "88", 3)],
  },
  {
    id: "samepose",
    weeks: [1, 3, 6],
    mode: "photo",
    heat: 3,
    render: (x) => `Same Pose. Everyone posts the same shot: ${x}`,
    hint: "Thirty of the same photo is a document. Underwear yes, explicit no.",
    plugs: [
      p("morningface", "your morning face, before coffee, no filter.", 2),
      p("bedview", "the view from your pillow.", 3),
      p("carseat", "the inside of your car, driver's seat.", 1),
      p("mirror", "bathroom mirror, phone in hand, whatever you're wearing.", 4),
      p("shoes", "your feet, wherever you are right now.", 2),
      p("fridgeselfie", "you, holding whatever's in your fridge.", 2),
      p("gymface", "post-workout face. Sweaty counts.", 3),
      p("bed", "you in bed, right now.", 4),
    ],
  },
  {
    id: "dare",
    weeks: [6],
    mode: "dare",
    heat: 3,
    render: (x) => `Sidequest: ${x}`,
    hint: "Proof by Sunday. Photo optional, story required.",
    plugs: [
      p("number", "give your number to a stranger this week. Or to someone in this Circle.", 3),
      p("pelican", "a photo with a pelican, a drag queen or a stranger's dog. All three and you're a legend.", 1),
      p("compliment", "compliment a man's shoulders out loud, in person, to his face.", 3),
      p("outfit", "wear the stay-over outfit somewhere it doesn't belong.", 3),
      p("bar", "go to the bar where you've made your worst decisions. Make a medium one.", 3),
      p("song", "request a song for someone in this Circle, anywhere with a DJ. Report back.", 2),
      p("shot", "buy a drink for the hottest stranger in the room. No talking first.", 3),
    ],
  },
  {
    id: "circlepick",
    weeks: [5, 7],
    mode: "text",
    heat: 3,
    render: (x) => x,
    plugs: [
      p("hm", "Whose answers in this Circle made you go \"hm\" so far? No names required. Hints encouraged.", 3),
      p("underrated", "The most underrated hot guy in this Circle. Make him blush.", 3),
      p("dinner", "Last week on Earth. Who in here are you taking to dinner? No strings. Probably.", 3),
      p("shoulders", "Best shoulders in the Circle. Vote with your chest.", 3),
      p("trouble", "Who in this Circle is trouble, and would you get in it?", 4),
      p("firstlook", "Whose answer did you look for first every Monday?", 2),
      p("jail", "Who in this Circle would you call from jail? He'd come. He'd also tell everyone.", 1),
    ],
  },
];

export const FORMAT_BY_ID = new Map(FORMATS.map((f) => [f.id, f]));
