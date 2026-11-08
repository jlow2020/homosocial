// Minis: one-tap questions that unlock after a guy plays the week's main drop.
// Two per week, spread over the rest of his week. Everyone in a Circle gets the
// same two, so the results mean something. Never rename an id: used ones are
// remembered by id.
//
//   pick: two options (This or That, Would You Rather, Agree / Hell no)
//   poll: three or four options
//   who:  vote for a guy in the Circle. Needs a room (see MINI_WHO_MIN).

export type MiniKind = "pick" | "poll" | "who";
export type Mini = { id: string; kind: MiniKind; q: string; options?: string[]; heat: number };

export const MINI_WHO_MIN = 4; // "who" minis need at least this many guys

const pick = (id: string, q: string, a: string, b: string, heat: number): Mini => ({ id, kind: "pick", q, options: [a, b], heat });
const poll = (id: string, q: string, options: string[], heat: number): Mini => ({ id, kind: "poll", q, options, heat });
const who = (id: string, q: string, heat: number): Mini => ({ id, kind: "who", q, heat });

export const MINIS: Mini[] = [
  // This or That
  pick("tot-lights", "Lights on or lights off?", "On. I want to see.", "Off. Let me imagine.", 3),
  pick("tot-morning", "Morning or midnight?", "Morning, before coffee", "Midnight, after drinks", 3),
  pick("tot-beard", "Beard or clean shaven?", "Beard. Scratch me.", "Smooth. Kiss me.", 2),
  pick("tot-text", "First move: text or eye contact?", "Text. I'm a coward.", "Eye contact. I'm a menace.", 2),
  pick("tot-cuddle", "After: cuddle or shower?", "Cuddle. Don't move.", "Shower. Join me.", 3),
  pick("tot-briefs", "Briefs or boxer briefs?", "Briefs", "Boxer briefs", 2),
  pick("tot-hands", "Hands or mouth?", "Hands", "Mouth", 4),
  pick("tot-tall", "Taller than you or shorter than you?", "Taller. Look down at me.", "Shorter. I'll look down at you.", 2),
  pick("tot-hairy", "Hairy chest or smooth chest?", "Hairy. Rug me.", "Smooth. Marble statue.", 2),
  pick("tot-loud", "Loud or quiet?", "Loud. The neighbors know.", "Quiet. Mysterious.", 4),
  pick("tot-slow", "Slow burn or right now?", "Slow burn", "Right now", 3),
  pick("tot-nerd", "Nerd or jock?", "Nerd", "Jock", 1),
  pick("tot-cologne", "Cologne or just him?", "Cologne", "Just him, after the gym", 3),
  pick("tot-dress", "Suit or sweatpants?", "Suit. Wreck me at a wedding.", "Gray sweatpants. You know why.", 3),
  pick("tot-tattoo", "Tattoos or none?", "Covered", "Clean canvas", 1),
  pick("tot-voice", "Deep voice or sweet voice?", "Deep. Ruin me.", "Sweet. Tell me I'm good.", 3),
  pick("tot-kiss", "Neck kisses or ear whispers?", "Neck", "Ear", 3),
  pick("tot-shower", "Shower together: hot or romantic?", "Hot. Logistics be damned.", "Romantic. Someone gets cold.", 3),
  pick("tot-sleep", "Big spoon or little spoon?", "Big spoon", "Little spoon", 2),
  pick("tot-first", "First date: drinks or dinner?", "Drinks. Low commitment.", "Dinner. I'm hungry and hopeful.", 1),
  pick("tot-gym", "Gym body or dad bod?", "Gym body", "Dad bod", 2),
  pick("tot-beach", "Nude beach or private pool?", "Nude beach. Let them look.", "Private pool. Just us.", 4),
  pick("tot-older", "Older or younger?", "Older. Teach me.", "Younger. Keep up.", 3),
  pick("tot-sheets", "His place or yours?", "His. I want to snoop.", "Mine. Home field advantage.", 3),
  pick("tot-scruff", "Five o'clock shadow or fresh shave?", "Shadow", "Fresh", 2),
  pick("tot-backseat", "Backseat or hotel room?", "Backseat. Steam the windows.", "Hotel room. Room service after.", 4),
  pick("tot-eyes", "Eyes open or eyes closed?", "Open", "Closed", 4),
  pick("tot-sweat", "Gym sweat or fresh out of the shower?", "Gym sweat", "Fresh shower", 4),

  // Would you rather
  pick("wyr-phone", "Would you rather your mom read your texts or your ex read your search history?", "Mom, texts", "Ex, search history", 3),
  pick("wyr-caught", "Would you rather get caught by a neighbor or by a roommate?", "Neighbor. Never see him again.", "Roommate. We'll laugh about it.", 4),
  pick("wyr-ex", "Would you rather date your ex's brother or your best friend's ex?", "Ex's brother", "Best friend's ex", 3),
  pick("wyr-voice", "Would you rather he moans your name or someone else's?", "Mine, obviously", "Someone else's. I'll investigate.", 4),
  pick("wyr-date", "Would you rather a perfect first date with no spark or a disaster date with crazy chemistry?", "Perfect, no spark", "Disaster, chemistry", 2),
  pick("wyr-sext", "Would you rather accidentally send a nude to your boss or your group chat?", "Boss", "Group chat", 4),
  pick("wyr-hookup", "Would you rather one amazing night or six good months?", "One amazing night", "Six good months", 3),
  pick("wyr-know", "Would you rather know his body count or his credit score?", "Body count", "Credit score", 3),
  pick("wyr-celeb", "Would you rather a night with a celebrity or a year with someone great nobody knows?", "Celebrity night", "Unknown, great year", 2),
  pick("wyr-snore", "Would you rather he snores or he steals the covers?", "Snores", "Steals covers", 1),
  pick("wyr-dancefloor", "Would you rather make out on a dance floor or in an elevator?", "Dance floor", "Elevator", 3),
  pick("wyr-dad", "Would you rather date someone exactly like your dad or exactly like your mom?", "Dad", "Mom", 2),
  pick("wyr-feet", "Would you rather he has a foot thing or a uniform thing?", "Foot thing", "Uniform thing", 4),
  pick("wyr-tan", "Would you rather tan lines or no tan lines?", "Tan lines. Show me the map.", "No tan lines. Even all over.", 4),
  pick("wyr-reply", "Would you rather he replies instantly or keeps you waiting just a little?", "Instantly", "Make me wait", 2),
  pick("wyr-skinny", "Would you rather skinny dip at midnight or watch someone else do it?", "Skinny dip", "Watch", 4),
  pick("wyr-hotter", "Would you rather date someone hotter than you or funnier than you?", "Hotter", "Funnier", 2),
  pick("wyr-ex-text", "Would you rather your ex texts \"I miss you\" or \"I'm engaged\"?", "\"I miss you\"", "\"I'm engaged\"", 2),
  pick("wyr-grindr", "Would you rather run into a hookup at work or at your family reunion?", "Work", "Family reunion", 4),

  // Hot takes: agree or hell no
  pick("hot-firstdate", "Hot take: you should know if you want to kiss him in the first five minutes.", "Agree", "Hell no", 2),
  pick("hot-tops", "Hot take: being a good kisser matters more than being good in bed.", "Agree", "Hell no", 3),
  pick("hot-gymselfie", "Hot take: a shirtless profile pic is a red flag.", "Agree", "Hell no", 2),
  pick("hot-ex", "Hot take: you can tell everything about a guy by how he talks about his ex.", "Agree", "Hell no", 1),
  pick("hot-open", "Hot take: monogamy is a choice, not a default.", "Agree", "Hell no", 3),
  pick("hot-moan", "Hot take: quiet guys are always the loudest in bed.", "Agree", "Hell no", 4),
  pick("hot-cuddle", "Hot take: cuddling is more intimate than sex.", "Agree", "Hell no", 3),
  pick("hot-height", "Hot take: height is a personality.", "Agree", "Hell no", 1),
  pick("hot-age", "Hot take: the best sex of your life happens after 35.", "Agree", "Hell no", 4),
  pick("hot-text", "Hot take: good morning texts are hotter than nudes.", "Agree", "Hell no", 3),
  pick("hot-hookup", "Hot take: you can absolutely fall for a hookup.", "Agree", "Hell no", 3),
  pick("hot-dance", "Hot take: if he can't dance, he can't...", "Agree", "Hell no", 4),

  // Polls
  poll("poll-turnon", "Biggest turn-on?", ["Confidence", "A good laugh", "Big hands", "When he takes charge"], 3),
  poll("poll-turnoff", "Instant turn-off?", ["Rude to the waiter", "Bad breath", "Talks about his ex", "Phone at dinner"], 1),
  poll("poll-body", "First thing you notice?", ["Eyes", "Smile", "Arms", "Butt"], 3),
  poll("poll-place", "Best place for a first kiss?", ["Doorstep goodnight", "Mid-sentence at the bar", "In the car", "Up against a wall"], 3),
  poll("poll-sexy", "Sexiest thing a guy can wear?", ["Gray sweatpants", "A tailored suit", "Just a towel", "Your shirt"], 3),
  poll("poll-nude", "Sending a nude: when is it okay?", ["After the first date", "When he asks nicely", "Never in writing", "Whenever. Life is short."], 4),
  poll("poll-firstdate", "Sex on the first date?", ["Yes, if it's right", "Never", "Depends on how good the drinks were", "Only if he pays"], 4),
  poll("poll-flirt", "Your flirting style?", ["Roast him", "Stare too long", "Touch his arm", "Pretend I'm not interested"], 2),
  poll("poll-red", "Biggest red flag?", ["No friends", "Still on the apps on date three", "Hates his mom", "Too perfect"], 1),
  poll("poll-spot", "Hottest spot to get kissed?", ["Neck", "Collarbone", "Back of the knee", "Lower back"], 4),
  poll("poll-snack", "Post-hookup snack?", ["Cereal", "Pizza", "Cigarette", "Another round"], 3),
  poll("poll-pda", "PDA limit?", ["Holding hands", "Light kiss", "Full make out", "Whatever, we're in love"], 2),
  poll("poll-pickup", "Best opener?", ["\"Hey\"", "A joke", "A compliment about something specific", "A shirtless pic"], 2),
  poll("poll-lasttime", "When did you last get butterflies?", ["This week", "This year", "I don't remember", "Right now, reading this"], 2),
  poll("poll-hands", "Where do his hands go on the first kiss?", ["Face", "Waist", "Back of the neck", "Lower"], 4),
  poll("poll-ghost", "Best way to end it after one date?", ["Honest text", "Slow fade", "Ghost", "Second date to be sure"], 1),
  poll("poll-dirty", "Dirty talk?", ["Yes, filthy", "A little", "Only if he starts", "I'll laugh"], 4),
  poll("poll-type", "Your type, in one word?", ["Trouble", "Golden retriever", "Daddy", "Whoever looks at me"], 3),
  poll("poll-bedroom", "What's actually in your nightstand?", ["Lotion and regret", "A book I'm not reading", "Snacks", "Plead the fifth"], 4),
  poll("poll-jealous", "How jealous are you, honestly?", ["Not at all", "A little", "Very", "I've checked his following list"], 2),
  poll("poll-weekend", "Perfect Sunday?", ["Brunch and a nap", "Bed all day, not sleeping", "Gym and errands", "Recovering"], 3),
  poll("poll-crush", "How long until you know you like him?", ["One look", "One date", "One month", "When he leaves"], 2),
  poll("poll-confess", "You've done it on…", ["A plane", "A beach", "A balcony", "None of your business"], 5),

  // Most likely to (vote for a guy in your Circle)
  who("who-trouble", "Who in your Circle is most likely to get you in trouble?", 3),
  who("who-kisser", "Who's the best kisser in the Circle? Gut feeling.", 4),
  who("who-sweet", "Who would send the best good morning text?", 2),
  who("who-freak", "Who's secretly the biggest freak?", 5),
  who("who-cook", "Who's cooking breakfast the morning after?", 3),
  who("who-heartbreaker", "Biggest heartbreaker in the Circle?", 3),
  who("who-daddy", "Who's giving daddy energy?", 4),
  who("who-roadtrip", "Who are you taking on a road trip?", 1),
  who("who-shirt", "Who should post a shirtless pic next?", 4),
  who("who-texts", "Who has the wildest camera roll?", 4),
  who("who-dance", "Who's dancing on the bar by midnight?", 2),
  who("who-married", "Who's getting married first?", 1),
  who("who-flirt", "Biggest flirt in the Circle?", 3),
  who("who-vegas", "Who are you calling for bail money in Vegas?", 2),
  who("who-cuddle", "Best cuddler, just by looking?", 3),
  who("who-hands", "Who has the best hands?", 4),
  who("who-mystery", "Who's the biggest mystery?", 2),
  who("who-date", "If you had to go on a date tonight, with who?", 4),
  who("who-kiss", "Spin the bottle. Who do you hope it lands on?", 5),
  who("who-secret", "Who's hiding the best secret?", 3),
];

export const MINI_BY_ID = new Map(MINIS.map((m) => [m.id, m]));
