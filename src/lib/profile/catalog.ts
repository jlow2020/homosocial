// The tag library. Deliberately broad: guys here are into fishing and F1 and
// church choir and anime and nursing school, not a checklist of "gay
// interests". Nobody ever sees this whole list. Each guy is shown the slice
// that fits him, built from his own words, what he's already picked, and
// what real guys in his Circle and across Homosocial pick together.
//
// Format per line: Label | words that mean it | related tags (by label)
// Never rename a label once guys have picked it: it's stored as a slug.

const RAW: Record<string, string> = {
  outdoors: `
Beach days | beach, the beach, sand, ocean | Paddleboarding, Snorkeling, Sunsets, Boat days, Surfing
Boat days | boat, boating, sandbar, pontoon | Fishing, Beach days, Sandbar parties, Jet skiing
Fishing | fishing, fish, angling | Boat days, Kayaking, Camping, Hunting
Kayaking | kayak, kayaking, canoe | Paddleboarding, Springs, Fishing, Camping
Paddleboarding | paddleboard, paddle boarding, sup | Beach days, Kayaking, Surfing
Surfing | surf, surfing | Beach days, Skateboarding, Paddleboarding
Snorkeling | snorkel, snorkeling | Scuba diving, Beach days, Keys trips
Scuba diving | scuba, diving | Snorkeling, Travel, Keys trips
Springs | springs, spring, rainbow springs, ichetucknee | Kayaking, Tubing, Camping
Tubing | tubing | Springs, Lake days
Lake days | lake | Boat days, Tubing, Wakeboarding
Wakeboarding | wakeboard, wakeboarding | Lake days, Boat days, Surfing
Jet skiing | jet ski, jetski | Boat days, Lake days
Hiking | hike, hiking, trails | Camping, Trail running, National parks, Dogs
Camping | camp, camping, tent | Hiking, Fishing, Campfires, National parks
National parks | national parks, national park | Hiking, Road trips, Photography
Campfires | campfire, bonfire, bonfires | Camping, Guitar, Stargazing
Stargazing | stars, stargazing, astronomy | Space, Camping, Photography
Gardening | garden, gardening, plants | Houseplants, Cooking, Farmers markets
Houseplants | houseplants, plant dad, plants | Gardening, Thrifting, Interior design
Birding | birds, birding, birdwatching | Photography, Hiking, Nature
Nature | nature, outdoors, outside | Hiking, Birding, Camping
Sunsets | sunset, sunsets | Beach days, Photography
Hunting | hunt, hunting, deer | Fishing, Camping, Country music
Horseback riding | horse, horses, riding | Ranch life, Country music
Ranch life | ranch, farm, farm life | Horseback riding, Country music, Trucks`,

  fitness: `
Gym | gym, lifting, weights, working out, workout | Powerlifting, Running, Meal prep, Bodybuilding
Powerlifting | powerlifting, deadlift, squat | Gym, Strongman
Bodybuilding | bodybuilding | Gym, Meal prep
CrossFit | crossfit | Gym, Running
Running | running, run, runner, 5k, marathon | Trail running, Half marathons, Gym
Half marathons | half marathon, marathon | Running
Trail running | trail running | Running, Hiking
Cycling | cycling, bike, biking, road bike | Running, Triathlons, Spin class
Spin class | spin, spinning, peloton | Cycling, Gym
Triathlons | triathlon, triathlons, ironman | Cycling, Running, Swimming
Swimming | swim, swimming, laps | Triathlons, Beach days
Yoga | yoga | Pilates, Meditation, Stretching
Pilates | pilates | Yoga, Barre
Barre | barre | Pilates
Stretching | stretching, mobility | Yoga
Boxing | boxing, box | Muay Thai, MMA, Gym
Muay Thai | muay thai, kickboxing | Boxing, MMA
MMA | mma, ufc | Boxing, Muay Thai, Jiu-jitsu
Jiu-jitsu | jiu jitsu, bjj, jiujitsu | MMA, Wrestling
Wrestling | wrestling | Jiu-jitsu, WWE
Rock climbing | climbing, bouldering, rock climbing | Hiking, Gym
Pickleball | pickleball | Tennis, Padel
Tennis | tennis | Pickleball, Padel, Watching tennis
Padel | padel | Tennis, Pickleball
Golf | golf, golfing | Disc golf, Watching golf
Disc golf | disc golf, frisbee golf | Golf, Hiking
Volleyball | volleyball, beach volleyball | Beach days, Kickball
Kickball | kickball | Softball, Volleyball
Softball | softball | Kickball, Baseball
Rugby | rugby | Watching rugby
Dance fitness | zumba, dance class | Dancing
Skateboarding | skate, skateboarding | Surfing, Snowboarding
Snowboarding | snowboard, snowboarding | Skiing, Skateboarding
Skiing | ski, skiing | Snowboarding, Travel
Meal prep | meal prep, macros | Gym, Cooking
Walking | walking, walks, long walks | Dogs, Hiking, Podcasts`,

  watching: `
Football | football, nfl | College football, Fantasy football, Tailgating
College football | college football, gators, noles, seminoles, ucf, usf, canes | Football, Tailgating
Fantasy football | fantasy football, fantasy | Football
Tailgating | tailgate, tailgating | Football, College football, Grilling
Basketball | basketball, nba | WNBA, March Madness
WNBA | wnba | Basketball
March Madness | march madness | Basketball, College football
Baseball | baseball, mlb, rays, marlins | Softball, Spring training
Spring training | spring training | Baseball
Hockey | hockey, nhl, lightning, bolts, panthers | Watching sports
Soccer | soccer, futbol, premier league, inter miami | World Cup
World Cup | world cup | Soccer, Travel
F1 | f1, formula 1, formula one | Racing, Cars
Racing | racing, nascar, indy | F1, Cars, Daytona
Daytona | daytona | Racing
WWE | wwe, wrestling, pro wrestling | Wrestling
Watching tennis | us open, wimbledon | Tennis
Watching golf | the masters, pga | Golf
Watching rugby | six nations | Rugby
Olympics | olympics | Gymnastics, Swimming
Gymnastics | gymnastics | Olympics
Figure skating | figure skating | Olympics
Watching sports | sports, sports bar | Football, Basketball, Baseball`,

  music: `
Country music | country, country music | Line dancing, Concerts, Guitar
Line dancing | line dancing | Country music, Dancing
Hip-hop | hip hop, rap | R&B, Concerts
R&B | r&b, rnb | Hip-hop, Neo soul
Neo soul | neo soul | R&B, Jazz
Pop | pop music, pop | Concerts, Karaoke
House music | house music, house | Techno, Dancing, Festivals
Techno | techno | House music, Festivals
EDM | edm, raves | Festivals, House music
Festivals | festival, festivals, coachella, edc | EDM, Concerts, Camping
Rock | rock, rock music | Metal, Punk, Concerts
Metal | metal, heavy metal | Rock, Punk
Punk | punk | Rock, Emo
Emo | emo | Punk
Indie | indie, indie music | Vinyl, Concerts
Jazz | jazz | Neo soul, Vinyl
Classical music | classical, orchestra, symphony | Opera, Piano
Opera | opera | Classical music, Theater
Latin music | reggaeton, salsa music, bachata, latin music | Salsa dancing, Dancing
K-pop | kpop, k-pop | Dancing, Pop
Gospel | gospel | Church choir, Singing
Church choir | choir, church choir | Gospel, Singing
Singing | singing, sing, vocalist | Karaoke, Church choir, Musical theater
Karaoke | karaoke | Singing, Bars
Guitar | guitar | Playing music, Country music
Piano | piano, keys | Playing music, Classical music
Playing music | play music, musician, band, drums | Guitar, Piano, Songwriting
Songwriting | songwriting, writing songs | Playing music, Poetry
DJing | dj, djing | House music, Vinyl
Vinyl | vinyl, records, record collecting | Indie, Jazz, DJing
Concerts | concert, concerts, live music | Festivals, Indie, Pop
Podcasts | podcast, podcasts | True crime, Walking`,

  dance: `
Dancing | dancing, dance, dance floor | Salsa dancing, Line dancing, House music
Salsa dancing | salsa, salsa dancing, bachata dancing | Latin music, Dancing
Ballroom | ballroom | Dancing
Voguing | vogue, voguing, ballroom scene | Dancing, Drag`,

  screen: `
Horror movies | horror, scary movies, horror movies | True crime, A24, Halloween
A24 | a24, indie films | Horror movies, Film photography, Indie
Movie nights | movies, movie, film, cinema | Horror movies, Comedies, Popcorn
Comedies | comedy, comedies | Stand-up comedy, Movie nights
Stand-up comedy | stand up, standup, comedy shows | Comedies, Podcasts
Documentaries | documentary, documentaries | True crime, History
True crime | true crime | Podcasts, Documentaries, Horror movies
Anime | anime | Manga, Video games, Cosplay
Manga | manga | Anime, Comics
Comics | comics, marvel, dc | Manga, Superhero movies
Superhero movies | marvel movies, superhero | Comics, Movie nights
Star Wars | star wars | Sci-fi, Video games
Sci-fi | sci-fi, scifi, science fiction | Star Wars, Star Trek, Reading
Star Trek | star trek | Sci-fi
Reality TV | reality tv, real housewives, love island, bravo | Drag Race, Survivor
Drag Race | drag race, rupaul | Drag, Reality TV
Survivor | survivor | Reality TV, Board games
The Golden Girls | golden girls | Sitcoms
Sitcoms | sitcoms, the office, friends | The Golden Girls, Comedies
Prestige TV | hbo, succession, the bear | Movie nights
Cooking shows | cooking shows, bake off | Cooking, Baking
YouTube | youtube | Podcasts
Classic movies | classic movies, old movies, tcm | Movie nights`,

  games: `
Video games | video games, gaming, gamer, xbox, playstation, nintendo, switch | PC gaming, Nintendo, Board games
PC gaming | pc gaming, steam | Video games
Nintendo | nintendo, zelda, mario, animal crossing | Video games
Pokémon | pokemon | Nintendo, Anime
Board games | board games, boardgames | Trivia, D&D, Game nights
Game nights | game night, game nights | Board games, Trivia
D&D | dnd, d&d, dungeons and dragons, ttrpg | Board games, Fantasy books
Trivia | trivia, pub trivia | Game nights, Bars
Chess | chess | Puzzles, Board games
Puzzles | puzzles, crossword, wordle | Chess, Reading
Card games | card games, poker, spades, magic the gathering, mtg | Game nights
Cosplay | cosplay | Anime, Conventions
Conventions | comic con, cons, conventions | Cosplay, Comics
Escape rooms | escape room, escape rooms | Puzzles, Game nights`,

  food: `
Cooking | cooking, cook, chef, home cooking | Baking, Grilling, Farmers markets
Baking | baking, bake | Cooking, Desserts
Grilling | grill, grilling, bbq, barbecue | Smoking meat, Tailgating, Cooking
Smoking meat | smoker, smoked meat, brisket | Grilling
Sushi | sushi | Ramen, Trying new restaurants
Ramen | ramen | Sushi
Tacos | tacos, taco | Mexican food, Trying new restaurants
Mexican food | mexican food | Tacos
Cuban food | cuban food, cuban sandwich, cafecito | Coffee, Latin music
Southern food | southern food, soul food | Cooking, Brunch
Brunch | brunch | Mimosas, Coffee
Coffee | coffee, espresso, latte, coffee shops | Cafés, Brunch
Cafés | cafes, coffee shops | Coffee, Reading
Wine | wine, vino | Wineries, Cheese boards
Wineries | wineries, wine tasting | Wine, Road trips
Craft beer | craft beer, beer, breweries | Breweries, Trivia
Breweries | brewery, breweries | Craft beer
Cocktails | cocktails, mixology | Bars, Speakeasies
Speakeasies | speakeasy, speakeasies | Cocktails
Whiskey | whiskey, bourbon | Cocktails
Sober life | sober, sobriety, sober curious | Coffee, Gym
Cheese boards | charcuterie, cheese | Wine
Desserts | dessert, desserts, sweets | Baking
Trying new restaurants | restaurants, foodie, eating out | Sushi, Tacos
Farmers markets | farmers market, farmers markets | Cooking, Gardening
Vegan cooking | vegan, plant based | Cooking
Hot sauce | hot sauce, spicy food | Cooking`,

  making: `
Woodworking | woodworking, carpentry | DIY projects, Home renovation
DIY projects | diy | Woodworking, Home renovation
Home renovation | renovation, flipping houses | DIY projects, Interior design
Interior design | interior design, decor | Home renovation, Thrifting
Thrifting | thrift, thrifting, thrift stores | Vintage, Fashion
Vintage | vintage | Thrifting, Antiques
Antiques | antiques, antiquing | Vintage
Fashion | fashion, style, clothes | Thrifting, Sneakers
Sneakers | sneakers, kicks | Fashion
Sewing | sewing, sew | Crafting, Cosplay
Crafting | crafts, crafting | Sewing, Painting
Painting | painting, paint | Drawing, Museums
Drawing | drawing, sketching, art | Painting, Tattoos
Tattoos | tattoos, ink | Drawing
Pottery | pottery, ceramics | Crafting, Painting
Photography | photography, photos, camera | Film photography, Travel
Film photography | film photography, film camera | Photography
Writing | writing, writer | Poetry, Reading
Poetry | poetry, poems | Writing, Reading
Knitting | knitting, crochet | Crafting
Candle making | candles | Crafting
3D printing | 3d printing | Tech, Building PCs
Building PCs | building pcs | PC gaming, Tech
Cars | cars, car guy, car shows | Racing, F1, Car detailing
Car detailing | detailing | Cars
Motorcycles | motorcycle, motorcycles, riding bikes | Cars
Trucks | trucks, truck | Ranch life, Cars
Model building | models, lego, legos | Building PCs`,

  culture: `
Theater | theater, theatre, broadway, plays | Musical theater, Opera
Musical theater | musicals, musical theater | Theater, Singing
Drag | drag, drag shows | Drag Race, Voguing
Museums | museums, museum, art museums | Painting, History
History | history | Documentaries, Museums
Reading | reading, books, book club, bookworm | Book club, Fantasy books, Poetry
Book club | book club | Reading
Fantasy books | fantasy, fantasy books | Reading, D&D
Romance novels | romance novels, romance books | Reading
Languages | languages, learning languages, duolingo | Travel
Astrology | astrology, zodiac | Tarot
Tarot | tarot | Astrology
Meditation | meditation, mindfulness | Yoga
Volunteering | volunteering, volunteer | Activism, Animal rescue
Activism | activism, organizing | Volunteering, Politics
Politics | politics | Activism, News
News | news | Politics, Podcasts
Church | church, faith, christian | Church choir, Volunteering
Spirituality | spirituality, spiritual | Meditation
Philosophy | philosophy | Reading
Space | space, nasa, rocket launches | Stargazing, Sci-fi
Rocket launches | rocket launch, launches, cape canaveral | Space`,

  goingout: `
Bars | bars, bar hopping | Cocktails, Karaoke, Trivia
Clubbing | clubbing, clubs, going out | Dancing, House music
Pool parties | pool party, pool parties | Pride events
Pride events | pride | Drag, Pool parties
Sandbar parties | sandbar | Boat days
Halloween | halloween, costumes | Horror movies, Cosplay
Theme parks | disney, universal, theme parks, busch gardens | Roller coasters, Travel
Roller coasters | roller coasters, coasters | Theme parks
Mini golf | mini golf | Bowling
Bowling | bowling | Mini golf, Game nights
Arcades | arcade, arcades | Video games, Bowling
Dinner parties | dinner parties, hosting | Cooking, Wine
Hosting | hosting, host | Dinner parties, Game nights`,

  travel: `
Travel | travel, traveling, travelling, passport | Road trips, Solo travel, Cruises
Road trips | road trip, road trips | Travel, National parks
Solo travel | solo travel | Travel, Hostels
Cruises | cruise, cruises | Travel, Keys trips
Keys trips | key west, the keys, florida keys | Snorkeling, Boat days
Camping trips | camping trip | Camping
Hostels | hostels, backpacking | Solo travel
Europe | europe | Travel, Languages
Mexico trips | mexico, cancun, cdmx | Travel, Tacos
Japan | japan | Travel, Anime, Ramen`,

  animals: `
Dogs | dog, dogs, puppy, dog dad | Dog parks, Hiking, Walking
Dog parks | dog park | Dogs
Cats | cat, cats, cat dad | Animal rescue
Animal rescue | rescue, fostering, adopt | Dogs, Cats, Volunteering
Reptiles | reptiles, snakes, lizards | Animal rescue
Birds as pets | parrot, bird dad | Birding
Horses | horses | Horseback riding
Aquariums | aquarium, fish tank | Snorkeling`,

  learning: `
Nursing | nurse, nursing, nursing school | Healthcare, Studying
Healthcare | healthcare, medicine, doctor, hospital | Nursing
Teaching | teacher, teaching | Reading, Volunteering
Tech | tech, coding, programming, software | Building PCs, Startups
Startups | startup, startups, entrepreneur, small business | Tech, Real estate
Real estate | real estate, realtor | Startups, Interior design
Investing | investing, stocks, finance | Startups
Law | law, lawyer, law school | Politics
Studying | studying, school, college, grad school | Reading, Coffee
Science | science | Space, Documentaries
Marketing | marketing, content | Photography, Startups
Military | military, veteran, navy, army, air force, marines | Gym
First responders | firefighter, ems, police | Gym
Hospitality | bartender, server, hospitality, restaurant work | Cocktails
Trades | electrician, plumber, construction, hvac | Trucks, Woodworking
Aviation | pilot, flying, aviation | Travel, Space`,
};

export type Tag = { slug: string; label: string; group: string; aliases: string[]; related: string[] };

export const GROUP_LABEL: Record<string, string> = {
  outdoors: "Outside",
  fitness: "Moving",
  watching: "Watching sports",
  music: "Music",
  dance: "Dancing",
  screen: "On screen",
  games: "Games",
  food: "Food and drink",
  making: "Making things",
  culture: "Culture",
  goingout: "Going out",
  travel: "Travel",
  animals: "Animals",
  learning: "Work and school",
};

export function slugOf(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function build(): Tag[] {
  const tags: Tag[] = [];
  const byLabel = new Map<string, string>();
  for (const [group, block] of Object.entries(RAW)) {
    for (const line of block.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const [label, aliases = "", related = ""] = line.split("|").map((x) => x.trim());
      const slug = slugOf(label);
      if (byLabel.has(label.toLowerCase())) continue;
      byLabel.set(label.toLowerCase(), slug);
      tags.push({
        slug,
        label,
        group,
        aliases: [label.toLowerCase(), ...aliases.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean)],
        related: related.split(",").map((r) => r.trim()).filter(Boolean),
      });
    }
  }
  // Related tags are written by label; store them as slugs, both directions.
  const slugs = new Set(tags.map((t) => t.slug));
  const map = new Map(tags.map((t) => [t.slug, t]));
  for (const t of tags) {
    t.related = t.related.map((r) => byLabel.get(r.toLowerCase()) ?? slugOf(r)).filter((s) => slugs.has(s) && s !== t.slug);
  }
  for (const t of tags) for (const r of t.related) {
    const o = map.get(r)!;
    if (!o.related.includes(t.slug)) o.related.push(t.slug);
  }
  return tags;
}

export const TAGS: Tag[] = build();
export const TAG_BY_SLUG = new Map(TAGS.map((t) => [t.slug, t]));

// Things to do together. Feeds Plans: post a beach day and the guys "down for" it hear about it.
export const DOWN_FOR: { slug: string; label: string }[] = [
  "Coffee", "Gym buddy", "Beach day", "Drinks", "Dinner", "Game night", "Concerts", "Road trips", "Hikes", "Movies",
  "Karaoke", "Brunch", "Dog walks", "Study sessions", "Pickup games", "Boat days", "Theme parks", "Volunteering",
  "Watch parties", "Cooking together", "Dancing", "Day trips", "Thrifting", "Running buddy",
].map((label) => ({ slug: slugOf(label), label }));

// A guy's own words: which catalog tags they mention. "boxing, true crime, Sunday tacos" -> Boxing, True crime, Tacos.
export function tagsInText(text: string): string[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9&'\s-]/g, " ").replace(/\s+/g, " ")} `;
  const hits: { slug: string; at: number; len: number }[] = [];
  for (const tag of TAGS) {
    for (const a of tag.aliases) {
      if (a.length < 3 && !["dj", "f1", "d&d", "mma", "bjj", "edm", "wwe", "nfl", "nba", "pop"].includes(a)) continue;
      const i = t.indexOf(` ${a} `);
      const j = i === -1 ? t.indexOf(` ${a}s `) : i;
      if (j !== -1) {
        hits.push({ slug: tag.slug, at: j, len: a.length });
        break;
      }
    }
  }
  // Prefer longer, more specific matches ("college football" over "football").
  hits.sort((a, b) => b.len - a.len);
  const out: string[] = [];
  const used: [number, number][] = [];
  for (const h of hits) {
    if (used.some(([s, e]) => h.at >= s && h.at < e)) continue;
    used.push([h.at, h.at + h.len + 1]);
    out.push(h.slug);
  }
  return out;
}
