// Profile prompts. He picks three and answers each in a sentence or two.
// Never change an id once guys have answered it.
export const PROFILE_PROMPTS: { id: string; text: string; hint: string }[] = [
  { id: "two-drink", text: "The two-drink version of me…", hint: "Be honest. We'll meet him eventually." },
  { id: "toxic-trait", text: "My toxic trait is…", hint: "Pick a fun one." },
  { id: "green-flag", text: "The green flag that gets me every time…", hint: "" },
  { id: "karaoke", text: "My karaoke song, no shame…", hint: "" },
  { id: "die-on", text: "A hill I will die on…", hint: "Food, music, pop culture, life." },
  { id: "perfect-saturday", text: "My perfect Saturday…", hint: "" },
  { id: "known-for", text: "My friends would say I'm known for…", hint: "" },
  { id: "unpopular", text: "Unpopular opinion…", hint: "" },
  { id: "teach-you", text: "I could teach you how to…", hint: "" },
  { id: "late-night", text: "2am me is…", hint: "" },
  { id: "first-date", text: "My idea of a good first hang…", hint: "Friends or more, your call." },
  { id: "weirdly-good", text: "I'm weirdly good at…", hint: "" },
  { id: "comfort-show", text: "The show I've rewatched way too many times…", hint: "" },
  { id: "dealbreaker", text: "Instant dealbreaker…", hint: "" },
  { id: "ask-me", text: "Ask me about…", hint: "Give guys an easy way in." },
  { id: "proud", text: "Something I'm lowkey proud of…", hint: "" },
  { id: "florida", text: "The most Florida thing about me…", hint: "" },
  { id: "embarrassing", text: "My most embarrassing celebrity crush…", hint: "" },
  { id: "story", text: "The story I tell at every party…", hint: "" },
  { id: "simple-pleasure", text: "A simple pleasure I'd defend with my life…", hint: "" },
  { id: "lie", text: "A lie I tell way too often…", hint: "" },
  { id: "learning", text: "Right now I'm trying to get better at…", hint: "" },
  { id: "spend-it", text: "If someone gave me $500 to spend today…", hint: "" },
  { id: "pet-peeve", text: "My pettiest pet peeve…", hint: "" },
  { id: "together", text: "We'll get along if you…", hint: "" },
  { id: "underrated", text: "The most underrated thing in Florida…", hint: "" },
  { id: "dinner-guest", text: "Dinner with anyone, living or dead…", hint: "" },
  { id: "red-flag", text: "My red flag, so you know up front…", hint: "" },
  { id: "soundtrack", text: "The song that's basically about me…", hint: "" },
  { id: "screenshot", text: "The text I'd screenshot and send to the group chat…", hint: "" },
];
export const PROMPT_BY_ID = new Map(PROFILE_PROMPTS.map((p) => [p.id, p]));

export const PHOTO_THEMES = [
  "Me at my most Florida",
  "My happy place",
  "Proof I can cook",
  "On a good hair day",
  "With my favorite animal",
  "Where I'd take you",
  "Me, mid-laugh",
  "The fit I'm proudest of",
  "My weekend, basically",
  "A throwback",
];

export const PRONOUNS = ["he/him", "he/they", "they/them", "any pronouns"];
export const ZODIAC = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export const RELATIONSHIP = ["Single", "Seeing someone", "Partnered", "Married", "Open", "It's complicated"];

// Half-written starters for every prompt, so nobody stares at an empty box.
// Tap one, change a word or two, done.
export const STARTERS: Record<string, string[]> = {
  "two-drink": ["starts a dance circle nobody asked for", "texts the group chat a voice memo, then a second one apologizing for the first", "tells the bartender his whole life story", "wants to go somewhere else, somewhere better, right now"],
  "toxic-trait": ["thinking I can make it there in 10 minutes", "buying plants I know I'll kill", "replying \"lol\" to things that were not funny", "rewatching the same show instead of starting a new one"],
  "green-flag": ["he texts back like a normal person", "he's nice to the server", "he asks a second question", "he has a hobby he won't shut up about"],
  "karaoke": ["anything by Whitney, and I commit", "a country song nobody expects from me", "the one I swore I'd never do again", "a duet, and you're doing it with me"],
  "die-on": ["pineapple belongs on pizza", "the beach is better at sunset than at noon", "the book was better, every time", "brunch is a meal, not an event"],
  "perfect-saturday": ["coffee, a long walk, and nowhere to be", "boat in the morning, nap in the afternoon, out at night", "farmers market, cook something big, people over", "sleep in, gym, tacos, repeat"],
  "known-for": ["always having a snack", "showing up early and staying late", "giving advice I don't take myself", "knowing a guy for everything"],
  "unpopular": ["the movie is better than the book", "Florida summers aren't that bad", "I don't like brunch", "texting is better than calling"],
  "teach-you": ["make a cocktail that'll ruin your Tuesday", "throw a spiral", "parallel park on the first try", "cook rice without a rice cooker"],
  "late-night": ["a philosopher with a snack", "ordering food I didn't need", "deep in a Wikipedia hole", "asleep. I'm sorry. I'm old."],
  "first-date": ["tacos and a long walk", "a dive bar with a good jukebox", "coffee that turns into dinner", "something with a little competition: bowling, mini golf, trivia"],
  "weirdly-good": ["remembering birthdays", "parallel parking", "guessing the ending of movies", "assembling IKEA furniture without the instructions"],
  "comfort-show": ["The Office, I know every word", "Golden Girls, forever", "anything with a baking competition", "Schitt's Creek, it's medicine"],
  "dealbreaker": ["rude to waiters", "never asks a question back", "doesn't like dogs", "too cool to have fun"],
  "ask-me": ["the worst job I ever had", "my plant collection", "the time I got lost in another country", "what I'm reading right now"],
  "proud": ["I finally learned to swim", "I keep a houseplant alive", "I ran my first half marathon", "I made it through nursing school clinicals"],
  "florida": ["I own more than three pairs of flip-flops", "I've driven through a hurricane for Publix subs", "I know the sunset time every night", "I've been to Disney more than any adult should"],
  "embarrassing": ["a cartoon fox, and I'll leave it there", "every single member of a boy band", "a weatherman from my hometown", "a guy from a cooking show"],
  "story": ["the night I accidentally crashed a wedding", "how I met my best friend in a parking lot", "the alligator incident", "the worst flight of my life"],
  "simple-pleasure": ["the first sip of coffee", "fresh sheets", "a perfectly ripe mango", "windows down, good song"],
  "lie": ["I'm five minutes away", "I'll just have one", "I read the whole thing", "I'm fine, it's fine"],
  "learning": ["cooking without a recipe", "Spanish", "saying no", "the guitar, slowly"],
  "spend-it": ["a really good dinner for my friends", "plants. Too many plants.", "a last-minute flight anywhere", "a massage and absolutely nothing else"],
  "pet-peeve": ["people who don't use their blinker", "\"we should hang out sometime\" with no plan", "loud chewing", "slow walkers in the middle of the aisle"],
  "together": ["like to eat", "laugh at your own jokes", "say yes to a last-minute plan", "can sit in comfortable silence"],
  "underrated": ["the springs in winter", "a gas station Cuban sandwich", "thunderstorms at 4pm on the dot", "sunrise on the Gulf side"],
  "dinner-guest": ["my grandmother at 30", "Dolly Parton", "whoever invented air conditioning", "my future self, for advice"],
  "red-flag": ["I will make a playlist for every occasion", "I talk to my dog like he's a person", "I'm competitive about board games", "I narrate my cooking out loud"],
  "soundtrack": ["Dancing On My Own", "Born This Way, unironically", "a sad country song", "something with a key change"],
  "screenshot": ["\"are you up\" from someone who should not be up", "my mom discovering emojis", "a group chat where everyone said \"lol\" and nobody laughed", "a typo that changed everything"],
};

// Lines to say in a voice hello, if he doesn't know what to say.
export const VOICE_SCRIPTS = [
  "Say your name, where you're from, and the last thing that made you laugh.",
  "Tell us what you'd do with a free Saturday in Florida.",
  "Say hi, then tell us your go-to karaoke song. Bonus points for singing a line.",
  "Introduce yourself like you're walking into the villa.",
];
