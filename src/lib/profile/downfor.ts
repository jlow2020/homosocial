import { TAG_BY_SLUG, slugOf } from "./catalog";

// Things to do with someone. A few work for anybody; the rest only show up
// when what he's into points at them. Format per line:
// Label | interest tags (by label) that lead here
// A "*" before the label marks the few that work for anybody.
// Never rename a label once guys have picked it: it's stored as a slug.
const RAW = `
*Coffee | Coffee, Cafés, Reading, Studying, Writing
*Drinks | Bars, Cocktails, Craft beer, Wine, Whiskey, Speakeasies
*Dinner | Trying new restaurants, Sushi, Ramen, Tacos, Mexican food, Cuban food, Southern food
*Walks | Walking, Dogs, Nature, Podcasts, Sunsets
*Movies | Movie nights, Superhero movies, Sci-fi, Comedies, Classic movies, A24, Horror movies
Brunch | Brunch, Coffee, Cocktails
Gym buddy | Gym, Powerlifting, Bodybuilding, CrossFit, Meal prep
Running buddy | Running, Half marathons, Trail running, Triathlons
Beach day | Beach days, Surfing, Paddleboarding, Snorkeling, Sunsets
Boat days | Boat days, Fishing, Jet skiing, Sandbar parties, Wakeboarding
Hikes | Hiking, National parks, Nature, Birding, Trail running
Camping trip | Camping, Campfires, Stargazing, Camping trips, Fishing
Fishing trip | Fishing, Boat days, Kayaking
Kayak or paddle | Kayaking, Paddleboarding, Springs, Lake days
Lake day | Lake days, Tubing, Wakeboarding, Jet skiing
Stargazing night | Stargazing, Space, Campfires, Rocket launches
Garden center run | Gardening, Houseplants
Birding walk | Birding, Nature, Photography
Trail ride | Horseback riding, Horses, Ranch life
Climbing session | Rock climbing
Yoga class | Yoga, Stretching, Meditation, Pilates
Spin or barre class | Spin class, Barre, Pilates, Dance fitness
Bike ride | Cycling, Triathlons
Swim laps | Swimming, Triathlons
Sparring partner | Boxing, Muay Thai, MMA, Jiu-jitsu, Wrestling
Pickup games | Pickleball, Volleyball, Kickball, Softball, Rugby, Basketball, Soccer
Pickleball doubles | Pickleball, Tennis, Padel
Tennis match | Tennis, Padel, Watching tennis
Golf round | Golf, Watching golf
Disc golf | Disc golf
Skate session | Skateboarding, Surfing, Snowboarding
Ski trip | Skiing, Snowboarding
Watch parties | Watching sports, Reality TV, Drag Race, Survivor, World Cup, Olympics
Game day | Football, College football, Fantasy football, Tailgating, Basketball, Baseball, Hockey, Soccer
Tailgate | Tailgating, College football, Football, Grilling
Ballgame | Baseball, Spring training, Softball
Race weekend | F1, Racing, Cars
Wrestling night | WWE, Wrestling
Concerts | Concerts, Rock, Indie, Pop, Hip-hop, R&B, Metal, Punk, Emo, Country music
Festivals | Festivals, EDM, House music, Techno
Karaoke | Karaoke, Singing, Musical theater, Pop, K-pop
Dancing | Dancing, Clubbing, House music, Latin music, Salsa dancing, Voguing
Line dancing | Line dancing, Country music
Salsa night | Salsa dancing, Latin music
Jazz bar | Jazz, Neo soul, Speakeasies
Record shopping | Vinyl, DJing, Indie, Jazz
Jam session | Guitar, Piano, Playing music, Songwriting
Open mic | Songwriting, Poetry, Stand-up comedy, Singing
The symphony or opera | Classical music, Opera
Comedy show | Stand-up comedy, Comedies, Sitcoms
Horror movie night | Horror movies, A24, Halloween
Anime night | Anime, Manga, Nintendo
Binge a show | Prestige TV, Sitcoms, Reality TV, The Golden Girls, Cooking shows, True crime, Documentaries
Drag Race viewing | Drag Race, Drag, Reality TV
Drag brunch | Drag, Drag Race, Brunch
Game night | Board games, Game nights, Card games, D&D, Puzzles
D&D campaign | D&D, Fantasy books
Trivia night | Trivia, History, Science, News
Co-op gaming | Video games, PC gaming, Nintendo, Pokémon
Arcade night | Arcades, Video games, Pokémon
Escape room | Escape rooms, Puzzles
Chess in the park | Chess
Cons and cosplay | Conventions, Cosplay, Comics, Star Wars, Star Trek, Anime
Cooking together | Cooking, Vegan cooking, Southern food, Meal prep
Baking day | Baking, Desserts
Cookout | Grilling, Smoking meat, Hot sauce, Southern food
Taco crawl | Tacos, Mexican food, Hot sauce
Sushi date | Sushi, Ramen, Japan
Farmers market | Farmers markets, Gardening, Cooking, Vegan cooking
Wine tasting | Wine, Wineries, Cheese boards
Brewery hop | Craft beer, Breweries
Cocktail bar | Cocktails, Speakeasies, Whiskey
Mocktails | Sober life
Dessert run | Desserts, Baking
Dinner parties | Dinner parties, Hosting, Cheese boards, Cooking
Thrifting | Thrifting, Vintage, Antiques, Fashion
Antique hunting | Antiques, Vintage, Interior design
Sneaker drops | Sneakers, Fashion
Museum day | Museums, History, Painting, Photography
Gallery hop | Painting, Drawing, Photography, Film photography
Theater night | Theater, Musical theater, Drag
Book swap | Reading, Book club, Fantasy books, Romance novels
Writing session | Writing, Poetry
Photo walk | Photography, Film photography, Sunsets
Craft night | Crafting, Knitting, Sewing, Candle making, Pottery
Pottery class | Pottery, Crafting
Paint and sip | Painting, Drawing, Wine
DIY project help | DIY projects, Woodworking, Home renovation, 3D printing
Car meet | Cars, Car detailing, Motorcycles, Trucks
Motorcycle ride | Motorcycles
Build a PC | Building PCs, PC gaming, Tech
Tattoo appointment buddy | Tattoos
Study sessions | Studying, Nursing, Law, Science, Teaching, Languages
Language exchange | Languages, Travel, Europe, Japan, Mexico trips
Volunteering | Volunteering, Animal rescue, Activism, Church
Pride events | Pride events, Activism, Drag
Rally or march | Activism, Politics
Church | Church, Gospel, Church choir, Spirituality
Meditation | Meditation, Spirituality, Yoga
Tarot night | Tarot, Astrology
Podcast recording | Podcasts, True crime
Networking | Startups, Marketing, Real estate, Investing, Tech
Road trips | Road trips, National parks, Travel, Solo travel
Day trips | Road trips, Travel, Springs, Beach days, Lake days
Weekend getaway | Travel, Cruises, Island getaways, Europe
Plane spotting | Aviation
Theme parks | Theme parks, Roller coasters
Mini golf or bowling | Mini golf, Bowling, Arcades
Pool party | Pool parties, Sandbar parties, Swimming
Halloween plans | Halloween, Horror movies, Cosplay
Dog walks | Dogs, Dog parks, Walking
Dog park meetup | Dog parks, Dogs
Cat cafe | Cats
Aquarium or zoo | Aquariums, Reptiles, Birds as pets, Animal rescue
Shelter volunteering | Animal rescue, Dogs, Cats
Clubbing | Clubbing, House music, Techno, EDM
Bar hop | Bars, Craft beer, Cocktails
`;

export type DownFor = { slug: string; label: string; standard: boolean; from: string[] };

export const DOWN_FOR: DownFor[] = RAW.trim()
  .split("\n")
  .map((line) => {
    const [l, f = ""] = line.split("|").map((x) => x.trim());
    const standard = l.startsWith("*");
    const label = l.replace(/^\*/, "");
    return { slug: slugOf(label), label, standard, from: f.split(",").map((x) => slugOf(x.trim())).filter(Boolean) };
  });
export const DOWN_BY_SLUG = new Map(DOWN_FOR.map((d) => [d.slug, d]));

export const downLabel = (s: string) => DOWN_BY_SLUG.get(s)?.label ?? s.replace(/-/g, " ");

// What to show him: a few that work for anybody, then the ones his interests
// point at, best match first. Nothing he hasn't given us a reason for.
export function suggestDown(interests: string[], picked: string[], limit = 18): DownFor[] {
  const mine = new Set(interests);
  // Related tags count a little, so "Sushi" also nudges toward "Ramen" plans.
  const near = new Set<string>();
  for (const s of interests) for (const r of TAG_BY_SLUG.get(s)?.related ?? []) near.add(r);
  const scored = DOWN_FOR.filter((d) => !d.standard)
    .map((d) => ({ d, s: d.from.filter((f) => mine.has(f)).length * 3 + d.from.filter((f) => near.has(f)).length * 0.5 }))
    .filter((x) => x.s > 0 || picked.includes(x.d.slug))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.d);
  const standards = DOWN_FOR.filter((d) => d.standard);
  const out = [...standards, ...scored];
  // Anything he already picked stays visible.
  for (const p of picked) if (!out.some((d) => d.slug === p) && DOWN_BY_SLUG.has(p)) out.push(DOWN_BY_SLUG.get(p)!);
  return out.slice(0, Math.max(limit, standards.length + picked.length));
}
