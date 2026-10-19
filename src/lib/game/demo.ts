// The fake guys who live in test Circles, and everything they say and do.
// Only ever used in Circles marked as test. "{me}" is swapped for the player's name.

export type DemoGuy = {
  slug: string;
  first_name: string;
  birthdate: string;
  zip: string;
  town: string;
  interests: string;
  hot_take: string;
  dating: boolean;
  colors: [string, string];
  dmReplies: string[];
};

export const CAST: DemoGuy[] = [
  {
    slug: "dante", first_name: "Dante", birthdate: "1998-02-11", zip: "34205", town: "Bradenton",
    interests: "boxing, true crime, Sunday tacos", hot_take: "Villains are just main characters with better outfits.",
    dating: true, colors: ["#ff3d8b", "#7a1fa2"],
    dmReplies: ["ok I was hoping you'd answer", "be honest. was my entrance too much", "we should get a drink before the Finale makes this weird"],
  },
  {
    slug: "kofi", first_name: "Kofi", birthdate: "1992-04-02", zip: "34285", town: "Venice",
    interests: "baking, Golden Girls, thrift stores", hot_take: "Cheesecake is a personality and I have it.",
    dating: true, colors: ["#f5c451", "#c2410c"],
    dmReplies: ["hi!! I was literally about to message you", "I'm bringing a cheesecake to whatever plan happens next, just so you know", "you're one of my favorite people in here and it's only been a few weeks"],
  },
  {
    slug: "ryan", first_name: "Ryan", birthdate: "1985-01-20", zip: "34242", town: "Siesta Key",
    interests: "paddleboarding, Jimmy Buffett, grilling", hot_take: "Sunscreen is optional if you believe in yourself.",
    dating: false, colors: ["#7cf0d0", "#0e7490"],
    dmReplies: ["hey man! come out to the beach sometime", "sunset at 6:52 tonight, I checked", "you'd love my neighbor's parrot. he swears"],
  },
  {
    slug: "luis", first_name: "Luis", birthdate: "1989-05-30", zip: "34221", town: "Palmetto",
    interests: "salsa, cooking, his abuela's stories", hot_take: "If there's no dancing, it's a meeting, not a party.",
    dating: true, colors: ["#ff7a59", "#9f1239"],
    dmReplies: ["¡oye! hi", "you dance? be honest", "I'm making ropa vieja Sunday, I'll save you some"],
  },
  {
    slug: "tyler", first_name: "Tyler", birthdate: "2000-03-08", zip: "34236", town: "Sarasota",
    interests: "lifting, anime, iced coffee", hot_take: "Leg day is a scam invented by people with good legs.",
    dating: true, colors: ["#8b5cf6", "#1e3a8a"],
    dmReplies: ["yo", "wait are you going to the trivia thing", "lol ok you're funny"],
  },
  {
    slug: "ben", first_name: "Ben", birthdate: "1974-02-14", zip: "34223", town: "Englewood",
    interests: "crosswords, birding, cardigans", hot_take: "Every party needs one man who leaves at 9:30.",
    dating: false, colors: ["#a3e635", "#3f6212"],
    dmReplies: ["Hello! I don't really do DMs but I'll make an exception", "The dog says hi. (There is still no dog.)", "You've made my Mondays better, I mean that"],
  },
  {
    slug: "marco", first_name: "Marco", birthdate: "1995-01-05", zip: "34202", town: "Lakewood Ranch",
    interests: "event planning, pickleball, spreadsheets", hot_take: "A plan without a time is just a vibe.",
    dating: true, colors: ["#38bdf8", "#4338ca"],
    dmReplies: ["hey! need anything for the next plan?", "I made a spreadsheet of who's coming. don't judge me", "you're good for this group, for real"],
  },
  {
    slug: "andre", first_name: "Andre", birthdate: "1981-04-19", zip: "34286", town: "North Port",
    interests: "cooking, vinyl, hot sauce", hot_take: "Anyone who orders a steak well done is hiding something.",
    dating: true, colors: ["#fb923c", "#7c2d12"],
    dmReplies: ["hey you. what are you eating tonight", "I'll cook. you bring the wine and the gossip", "you're trouble. I like it"],
  },
  {
    slug: "sam", first_name: "Sam", birthdate: "2003-01-27", zip: "34236", town: "Sarasota",
    interests: "printmaking, horror movies, thrifting", hot_take: "Ringling is the best museum in Florida and I'll fight you.",
    dating: false, colors: ["#e879f9", "#581c87"],
    dmReplies: ["hiii", "ok you HAVE to see the print I'm working on", "horror movie night when?"],
  },
  {
    slug: "hollis", first_name: "Hollis", birthdate: "1968-03-03", zip: "34229", town: "Osprey",
    interests: "musical theater, gardening, martinis", hot_take: "Every problem can be solved with a key change.",
    dating: false, colors: ["#fda4af", "#be123c"],
    dmReplies: ["Darling, hello.", "I taught theater for thirty years. I can tell when someone's got a story. You do.", "Martinis on my porch. You're invited. Bring Ben, he needs to get out."],
  },
  {
    slug: "jae", first_name: "Jae", birthdate: "1993-05-12", zip: "34202", town: "Lakewood Ranch",
    interests: "nursing, K-pop, karaoke", hot_take: "Night shift people are a different species and we should unionize.",
    dating: true, colors: ["#22d3ee", "#155e75"],
    dmReplies: ["omg hi, sorry I just got off a 12", "karaoke soon?? I need a duet partner", "you'd be a great nurse btw, you check on everybody"],
  },
  {
    slug: "wes", first_name: "Wes", birthdate: "1987-02-09", zip: "34275", town: "Nokomis",
    interests: "fishing, woodworking, old country", hot_take: "Texting is fine but calling is better.",
    dating: true, colors: ["#94a3b8", "#1e293b"],
    dmReplies: ["hey", "not much of a texter. you free to grab coffee sometime?", "caught a snook this morning. thought of the Circle, weirdly"],
  },
  {
    slug: "theo", first_name: "Theo", birthdate: "1997-04-23", zip: "34236", town: "Sarasota",
    interests: "DJing, coffee, vintage shirts", hot_take: "Every playlist should have one song that makes people say \"wait, what is this.\"",
    dating: true, colors: ["#facc15", "#a16207"],
    dmReplies: ["heyyy", "I'm making a Circle playlist. what's your song", "come by the shop, coffee's on me"],
  },
  {
    slug: "gabe", first_name: "Gabe", birthdate: "1982-01-16", zip: "34205", town: "Bradenton",
    interests: "law, tennis, reality TV", hot_take: "Being petty is just being organized about your feelings.",
    dating: false, colors: ["#4ade80", "#14532d"],
    dmReplies: ["Counselor here. What's the tea.", "Objection: you haven't been to a plan yet.", "You're one of the good ones. Don't make me say it twice."],
  },
];

export const CAST_BY_SLUG = new Map(CAST.map((g) => [g.slug, g]));

// Which prompt test Circles get each week, so the fake guys' answers fit.
// These are the juiciest prompt each week, since a test Circle is the demo.
export const DEMO_PROMPT: Record<number, string> = {
  1: "w1-exes",
  2: "w2-open",
  3: "w3-comeover",
  4: "w4-public",
  5: "w5-position",
  6: "w6-baddecisions",
  7: "w7-underrated",
  8: "w8-almostdm",
};

export const DEMO_ANSWERS: Record<string, [string, string][]> = {
  "w1-exes": [
    ["dante", "In bed. Next question. (They'd say I'm a lot. They'd be right.)"],
    ["kofi", "In a relationship: \"he feeds you until you can't leave.\" In bed: honestly, also that."],
    ["ryan", "Relationship: \"never on time.\" I'm picking that one. You'll never know the other."],
    ["luis", "In bed: \"he talks the whole time.\" In Spanish. Nobody's complained."],
    ["tyler", "relationship: I fall asleep during movies. bed: same answer unfortunately"],
    ["ben", "My ex would say I'm \"steady.\" I've decided that's a compliment in both categories."],
    ["marco", "Relationship: \"he booked our anniversary dinner a year out.\" Bed: also scheduled. Thursdays."],
    ["hollis", "Darling, my exes would say I was a gift. In both rooms. The ones who disagree are dead to me."],
    ["jae", "Relationship: \"he's always on nights.\" Bed: \"he's always on nights.\" Very different meanings."],
    ["theo", "Bed. Obviously bed. The relationship one is a whole podcast."],
    ["andre", "Both: \"generous with the hot sauce.\" Interpret that however you want."],
    ["gabe", "No comment. Anything I say can and will be used against me."],
  ],
  "w2-open": [
    ["gabe", "Group project. Somebody always does all the work and somebody always shows up late with excuses."],
    ["kofi", "Future, but only if the rules are written down. Laminated. On the fridge."],
    ["andre", "I've been in one. It's a buffet. Sounds amazing, and then it's 11pm and you're sad and bloated."],
    ["luis", "Closed. I'm Catholic, I already have enough guilt to manage."],
    ["sam", "Future. Also I'm 23 and can't afford one boyfriend, let alone a rotation."],
    ["hollis", "I was in one in 1994. We called it \"the arrangement.\" It ended with a casserole thrown across a room."],
    ["tyler", "wait what's the group project"],
    ["wes", "Closed. I can barely keep up with one guy texting me."],
    ["dante", "Open, but I'm the one who gets jealous. I'm aware. I'm working on it. I'm not."],
    ["theo", "Depends on the guy. With the right one I'd lock the door and delete the apps."],
  ],
  "w3-comeover": [
    ["theo", "Playlist starts with something cool and ends with Sade. If we make it to Sade, you're staying."],
    ["andre", "I cook. Nobody has ever left after the short ribs. Nobody."],
    ["hollis", "A martini, a lamp with a red scarf over it, and Sondheim at a respectful volume."],
    ["dante", "I don't have a move. I just text \"come over.\" It works more than it should."],
    ["kofi", "Fresh sheets and a warm cheesecake. I'm not subtle, I'm hospitable."],
    ["jae", "Honestly? I'm off a 12 and I need you to come over so I don't fall asleep in my scrubs. Romance."],
    ["marco", "I clean for three hours and then act like it always looks like this."],
    ["ryan", "Hot tub. I don't own a hot tub. My neighbor does. He travels a lot."],
    ["luis", "I teach you salsa in my kitchen. By the second song nobody's counting steps anymore."],
    ["wes", "Fire pit, two beers, and I don't say much. Seems to do the trick."],
  ],
  "w4-public": [
    ["gabe", "A courthouse elevator. I'll let you figure out which one of us was on the jury."],
    ["hollis", "A choir loft. I was 19. God saw. God did not intervene."],
    ["ryan", "A lifeguard stand on Siesta at 2am. The lifeguard was off duty. Mostly."],
    ["tyler", "Publix parking lot in a Kia Soul. Not my proudest moment. Not my worst either."],
    ["sam", "The back row of a museum lecture on Baroque art. The Baroque was not the most impressive thing in that room."],
    ["andre", "A dressing room at Burlington. He came in for khakis. He left with more than khakis."],
    ["luis", "A ferris wheel at the county fair. Two full rotations. Personal best."],
    ["dante", "An airport lounge bathroom. I got upgraded that day in more ways than one."],
    ["marco", "A pontoon boat. Very public. Very wobbly. I lost a sandal and my dignity."],
    ["ben", "Never. I'm boring. Please stop looking at me. (A drive-in. 1991. Don't tell anyone.)"],
  ],
  "w5-position": [
    ["dante", "Top. I said what I said. I'm the villain, not the villain's laundry."],
    ["kofi", "Bottom and proud. I'm a baker. I know what happens when you rush things."],
    ["ryan", "Depends on his shoulders. And whether he's sunburned."],
    ["luis", "Vers. Like salsa. You take turns leading."],
    ["tyler", "vers but mostly whoever's less sore from leg day"],
    ["marco", "I made a spreadsheet. The results were inconclusive."],
    ["hollis", "In 1994 we didn't label it. We just called it Tuesday."],
    ["jae", "Bottom on my days off. On nights I'm a pillow."],
    ["theo", "Depends on his shoulders. And his playlist. Bad playlist, I'm leaving."],
    ["andre", "Top. I make dinner, I'm in charge of dessert too."],
    ["wes", "Not saying it in a group chat. Ask me in person."],
    ["gabe", "Power vers. I argue both sides professionally."],
  ],
  "w6-baddecisions": [
    ["theo", "The dive by the airport. I DJ'd there once, left with the bartender, then got booked to DJ for his ex. Five stars."],
    ["dante", "The karaoke bar downtown. I sang Toxic directly at a man I'd matched with. His boyfriend clapped. Recommend."],
    ["hollis", "The piano bar. I've proposed there twice. Neither one stuck. The martinis are perfect."],
    ["jae", "The 24-hour diner next to the club. Every bad decision I've made happened at 3am over cheese fries. Go."],
    ["ryan", "Any tiki bar on the Key after 10. You go for one drink and wake up engaged to a guy with a boat."],
    ["andre", "The wine bar out in Lakewood Ranch. Expensive, quiet, and I've cried in the bathroom twice. Love it."],
    ["tyler", "the bar with the mechanical bull. I don't remember most of it. there are videos. don't look"],
    ["marco", "I've never made a bad decision at a bar. I bring a spreadsheet. (I've made three. All on Siesta.)"],
    ["gabe", "Objection to the premise. But: the sports bar that does drag brunch. I lost a bet and my dignity, in that order."],
  ],
  "w7-underrated": [
    ["kofi", "{me}. You walk in like you own the place and somehow you do. Blush, sir."],
    ["ben", "Wes. Quiet, broad shoulders, builds furniture. I'm a happily retired old man and even I noticed."],
    ["hollis", "Ben. Darling, that cardigan is doing more than you think it is."],
    ["dante", "Gabe. Don't let the lawyer thing fool you. That jawline argues its own case."],
    ["jae", "Marco. A man with a color-coded calendar? Stop. I'm serious. Stop."],
    ["theo", "{me}, obviously. Have you seen that crown? It's working."],
    ["luis", "Sam. Too cool to know it. Somebody tell him."],
    ["sam", "Luis. When he dances it's genuinely unfair to everyone else in the room."],
    ["andre", "Tyler. He thinks Sydney is the capital of Australia and somehow that makes him hotter."],
  ],
  "w8-almostdm": [
    ["kofi", "hey so. I think about your week 3 answer more than I should."],
    ["dante", "Are you free Saturday or is that too forward. (Deleted. Typed it again. Deleted.)"],
    ["jae", "I know this game says \"friends\" but I'd like to be the other thing."],
    ["sam", "Your neighbor with the hot tub. Is he single. Asking for me."],
    ["andre", "If you pick me Sunday I'll cook for you every week until one of us dies."],
    ["luis", "I can't tell if you're flirting or just nice and it's ruining my life."],
    ["theo", "You looked really good in that plan photo. That's it. That's the DM."],
    ["wes", "Do you want to skip the Finale and just get a drink."],
    ["marco", "I'm bad at this. Coffee? You pick the place. I won't make a spreadsheet. Probably."],
  ],
};

// When the player answers in a test Circle, a few guys react and reply.
export const DEMO_REPLIES = [
  "ok this might be the answer of the week",
  "screenshotting this",
  "sir.",
  "the confidence 👑",
  "I need to know more about this immediately",
  "Daddy said what he said",
  "wait this is so good",
  "LOL",
  "I respect it",
  "this is why I open the app on Mondays",
];

// The Lounge, week by week.
export const DEMO_LOUNGE: Record<number, [string, string][]> = {
  1: [
    ["tyler", "who else signed up at 2am and immediately regretted the ID selfie"],
    ["kofi", "the lighting in my ID photo is a hate crime"],
    ["dante", "Gabe pleading the fifth in WEEK ONE"],
    ["gabe", "Counsel advises silence"],
    ["luis", "Jae's \"always on nights\" answer took me out"],
    ["jae", "I stand by it"],
    ["ben", "Hello everyone. I'm told this is the group chat."],
    ["hollis", "Ben, darling, \"steady\" is the sexiest word in the English language."],
  ],
  2: [
    ["gabe", "I stand by everything I said about open relationships"],
    ["kofi", "Gabe I'm laminating a rule just for you"],
    ["hollis", "The casserole story is true and he deserved it"],
    ["marco", "Trivia Thursday. It's in Plans. Please RSVP so I can make a seating chart"],
    ["theo", "a seating chart for trivia"],
    ["marco", "yes"],
  ],
  3: [
    ["jae", "Andre's short ribs answer made me hungry in a way I wasn't ready for"],
    ["andre", "That's the point"],
    ["dante", "Ryan, your NEIGHBOR'S hot tub??"],
    ["ryan", "he said help yourself. he meant the plants. I'm choosing to interpret"],
    ["sam", "trivia was so fun. we lost by 2 points because Tyler said the capital of Australia was Sydney"],
    ["tyler", "it SHOULD be"],
  ],
  4: [
    ["dante", "these anonymous answers are going to haunt me"],
    ["kofi", "whoever said Burlington khakis, I need the rest of that story"],
    ["theo", "the choir loft one is so clearly Hollis"],
    ["hollis", "I have no idea what you're talking about. Places, everyone."],
    ["gabe", "I plead the fifth on all of them"],
  ],
  5: [
    ["theo", "Wes \"ask me in person\" is the hottest answer in this Circle and he knows it"],
    ["wes", "I don't know that"],
    ["luis", "Hollis calling it Tuesday 💀"],
    ["jae", "Kofi's baker answer wins the week, I'm sorry"],
    ["kofi", "patience is a virtue, babe"],
  ],
  6: [
    ["marco", "Sunset pontoon is in Plans. RSVP or I'll make a spreadsheet about you"],
    ["ryan", "I'll bring the speaker"],
    ["dante", "Tyler there are VIDEOS??"],
    ["tyler", "there are videos"],
    ["hollis", "I'll be at the piano bar if anyone needs me. Forever."],
  ],
  7: [
    ["kofi", "the blush answers are making me blush and they're not even about me"],
    ["wes", "Ben. Thank you. I'm going to go sit in my truck for a minute"],
    ["ben", "Take your time, son."],
    ["gabe", "Dante, I'll accept the compliment into evidence"],
    ["theo", "one week left. who's ready"],
  ],
  8: [
    ["jae", "I don't want this to end"],
    ["marco", "It doesn't end, it just gets a new Season"],
    ["dante", "picks are so stressful, I've changed mine four times"],
    ["luis", "the almost-DM answers... somebody in here is about to get a very good Sunday"],
    ["hollis", "Places."],
  ],
};

// Plans the fake guys post, by the week they show up.
export const DEMO_PLANS: { week: number; by: string; title: string; place: string; daysIn: number; hour: number; details: string; rsvps: string[] }[] = [
  { week: 2, by: "marco", title: "Trivia Thursday", place: "A brewery downtown", daysIn: 3, hour: 19, details: "Teams of 4. I'll bring name tags. Yes, really.", rsvps: ["sam", "tyler", "kofi", "gabe", "jae"] },
  { week: 3, by: "ryan", title: "Sunset on Siesta", place: "Siesta Key Beach, access 5", daysIn: 5, hour: 18, details: "Bring a chair. I'll bring the cooler and the bad snacks.", rsvps: ["luis", "theo", "ben", "wes"] },
  { week: 5, by: "jae", title: "Karaoke night", place: "Private room, Main Street", daysIn: 4, hour: 21, details: "I need a duet partner. Non-negotiable.", rsvps: ["theo", "kofi", "hollis", "dante"] },
  { week: 6, by: "marco", title: "Sunset pontoon", place: "Marina, Nokomis", daysIn: 5, hour: 18, details: "$100 won the vote. Split it. Sunscreen is NOT optional, Ryan.", rsvps: ["ryan", "andre", "sam", "hollis", "wes", "luis", "kofi"] },
];

// Week 7: Roses between the fake guys, and some for the player.
export const DEMO_ROSES: [string, string, string][] = [
  ["kofi", "{me}", "{me}, you made Mondays something I actually looked forward to. Thank you."],
  ["hollis", "{me}", "{me}, you have the rarest thing: you make everyone else feel funny."],
  ["wes", "{me}", "Glad you're in here, {me}."],
  ["ben", "hollis", "Hollis, you made an old man feel like he had a scene partner again."],
  ["jae", "marco", "Marco, nobody would have met in person without you. The spreadsheets were love."],
  ["dante", "luis", "Luis, you're the warmest person I've met in Florida."],
  ["sam", "theo", "Theo, the playlist. That's it. That's the rose."],
  ["gabe", "tyler", "Tyler. Sydney is not the capital. But you're the heart of this place."],
  ["andre", "kofi", "Kofi, your cheesecake changed my life and so did you."],
];

// Week 8 picks. "{me}" is the player.
export const DEMO_PICKS: { from: string; friend: string[]; date: string[] }[] = [
  { from: "kofi", friend: ["{me}", "ben", "andre", "hollis"], date: [] },
  { from: "ben", friend: ["{me}", "hollis", "kofi"], date: [] },
  { from: "hollis", friend: ["{me}", "ben", "sam"], date: [] },
  { from: "marco", friend: ["{me}", "jae", "wes"], date: [] },
  { from: "jae", friend: ["{me}", "theo", "marco"], date: [] },
  { from: "dante", friend: ["luis", "andre"], date: ["{me}"] },
  { from: "theo", friend: ["jae", "sam"], date: ["{me}"] },
  { from: "wes", friend: ["marco", "ryan"], date: ["{me}"] },
  { from: "andre", friend: ["kofi"], date: ["dante"] },
  { from: "luis", friend: ["dante", "theo", "ryan"], date: [] },
  { from: "sam", friend: ["hollis", "theo"], date: [] },
  { from: "gabe", friend: ["tyler", "marco"], date: [] },
  { from: "ryan", friend: ["luis", "wes"], date: [] },
  { from: "tyler", friend: ["gabe", "jae"], date: [] },
];

// Week 8 setups: [nominator, guy A, guy B].
export const DEMO_SETUPS: [string, string, string][] = [
  ["kofi", "{me}", "andre"],
  ["ben", "{me}", "andre"],
  ["marco", "{me}", "wes"],
  ["hollis", "ben", "sam"],
];

// The DM a fake guy opens with in Week 1.
export const DEMO_FIRST_DM: { from: string; body: string } = { from: "dante", body: "ok your answer. we need to talk." };
