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
export const DEMO_PROMPT: Record<number, string> = {
  1: "w1-villa",
  2: "w2-open",
  3: "w3-comeover",
  4: "w4-public",
  5: "w5-publix",
  6: "w6-hundred",
  7: "w7-award",
  8: "w8-lights",
};

export const DEMO_ANSWERS: Record<string, [string, string][]> = {
  "w1-villa": [
    ["dante", "Pony, obviously. Shirt optional, personality also optional. To the hottest guy: \"I'm the villain. You're my plotline.\""],
    ["kofi", "The Golden Girls theme, slowed and reverb. A linen set I can't afford. \"I brought cheesecake, and you look like you share.\""],
    ["ryan", "Jimmy Buffett. Board shorts. I trip on the step on purpose and land at his feet. \"Meant to do that. Did it work?\""],
    ["luis", "Celia Cruz. All white. I don't say anything. I hold out my hand and we dance."],
    ["tyler", "Espresso. Gym shorts I've worn three days straight. \"Is there wifi? Also are you single?\""],
    ["ben", "No song. Cardigan. To the hottest guy: \"Young man, has anyone fed the dog?\" There is no dog. It works anyway."],
    ["marco", "Something with a key change. Pressed shirt. \"Hi, I'm Marco. I already added you to the group chat.\""],
    ["hollis", "A full overture. Velvet jacket. \"Darling, you're standing in my light. Stay there.\""],
    ["jae", "A K-pop song you don't know yet. Scrubs, straight off a shift. \"I'm a nurse. Want me to check your pulse? It's racing.\""],
    ["theo", "I'm DJing my own entrance. Bowling shirt, unbuttoned one too many. \"This next one's for the bottoms.\""],
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
  "w5-publix": [
    ["dante", "A Pub Sub with everything on it. Messy, a little much, and I'll finish it in the car."],
    ["kofi", "The bakery case at 7pm when everything's 50% off. Sweet and slightly unhinged."],
    ["jae", "Publix chicken tenders. Dependable. Hot. Gone by 3pm."],
    ["luis", "A tres leches cake. Soft, a little extra, everybody wants a piece."],
    ["andre", "The guy at the deli counter who knows your order. That's it. That's the type."],
    ["theo", "Cuban bread. Warm, crunchy outside, soft inside, gone too fast."],
    ["wes", "Bag of ice. Simple, does the job, shows up for the cooler."],
    ["tyler", "Protein shake from the cold aisle and whoever's restocking it"],
    ["marco", "A Publix greeting card. Thoughtful, on time, and picked out with intention."],
  ],
  "w6-hundred": [
    ["marco", "Sunset pontoon, split twelve ways, Saturday 6 to 10. I've already made the spreadsheet. Vote yes."],
    ["ryan", "Siesta at sunset, a cooler, a speaker, $100 of snacks. Done. Easy. Beautiful."],
    ["hollis", "Matinee at the playhouse and martinis after. I'll cover the olives."],
    ["andre", "I cook for everyone. $100 is groceries. Bring chairs."],
    ["theo", "Thrift store challenge: $8 each, best outfit wins, then karaoke in the outfits."],
    ["jae", "Karaoke. Private room. I need a duet partner and I've chosen all of you."],
    ["luis", "Salsa night. First lesson is free. Then we drink."],
    ["sam", "Ringling on a free day, then horror movie at my place. $100 is popcorn."],
  ],
  "w7-award": [
    ["ben", "Most likely to adopt a third cat: Kofi. He's already looking. I've seen his tabs."],
    ["kofi", "Best at making Mondays less bad: {me}. Every single week."],
    ["hollis", "Best supporting actor in every thread: Ben. Quietly carrying this whole Season."],
    ["marco", "Most likely to show up to the plan: Wes. Never says much, never misses."],
    ["jae", "Best hype man: Theo. He reacted to every answer before I finished reading it."],
    ["dante", "Most dangerous in a DM: Andre. I'm not elaborating."],
    ["gabe", "Most improved answers: Tyler. Week 1 he said \"is there wifi.\" Look at him now."],
    ["theo", "Most likely to make me cry at the Finale: Luis. Already did, honestly."],
    ["sam", "Funniest guy in here: {me}. Not close."],
  ],
  "w8-lights": [
    ["ben", "I almost didn't sign up. I'm really glad I did."],
    ["kofi", "You guys made a new city feel like home. That's not a small thing."],
    ["dante", "I came in as the villain. I'm leaving as, like, a guy with friends. Gross."],
    ["hollis", "Places, everyone. And thank you. This was the best show I've been in in years."],
    ["jae", "Night shift is lonely. This wasn't. Thank you."],
    ["luis", "Mi abuela asked who my new friends are. I showed her this Circle. She approves."],
    ["marco", "I'll miss making spreadsheets for you. I'm not going to stop, though."],
    ["wes", "Not good at saying stuff. Glad I met y'all."],
    ["theo", "Playlist's done. Every song's somebody in here. Guess which one is yours."],
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
    ["dante", "Ryan is from Siesta Key, I need everyone to be normal about it"],
    ["ryan", "too late"],
    ["ben", "Hello everyone. I'm told this is the group chat."],
    ["luis", "Ben winning week one with a dog that doesn't exist"],
    ["ben", "he exists in my heart"],
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
    ["wes", "bag of ice was a real answer"],
    ["theo", "Wes I would marry the bag of ice answer"],
    ["luis", "the type answers this week??? I learned too much"],
    ["jae", "Publix chicken tenders is a love language and I'm right"],
  ],
  6: [
    ["marco", "Sunset pontoon is winning by 4 votes. Final call Thursday."],
    ["ryan", "I'll bring the speaker"],
    ["andre", "I'll bring food. Real food. Not chips."],
    ["sam", "I've never been on a boat"],
    ["hollis", "Then you'll sit next to me, darling. I'll narrate."],
  ],
  7: [
    ["kofi", "the Roses are making me cry at work"],
    ["ben", "I have read every single one twice"],
    ["gabe", "I'm not crying, I'm litigating"],
    ["theo", "one week left. who's ready"],
  ],
  8: [
    ["jae", "I don't want this to end"],
    ["marco", "It doesn't end, it just gets a new Season"],
    ["dante", "picks are so stressful, I've changed mine four times"],
    ["luis", "Sunday 8pm. phones in hand at 7:59"],
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
export const DEMO_FIRST_DM: { from: string; body: string } = { from: "dante", body: "ok your entrance. we need to talk." };
