// Text rules, tuned for a flirty adult app: dirty talk is the point and is
// never flagged. What we look for is narrow: selling sex, drugs, minors,
// spam and promo, hate, threats. Every rule is built to avoid false alarms:
// single ambiguous words never trigger on their own, only combinations do.

export type Surface = "public" | "dm" | "profile";
export type Category = "minor" | "solicitation" | "drugs" | "spam" | "hate" | "threat" | "contact";
// clear: hold it for a human before anyone sees it. maybe: let it through, a human glances later.
export type Level = "clear" | "maybe";
export type TextHit = { category: Category; level: Level; reason: string; match: string; urgent?: boolean };

const NUM_WORDS: Record<string, number> = { thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17 };

function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[​-‏⁠﻿]/g, "")
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(/([a-z])\1{2,}/g, "$1$1"); // "sooooo" -> "soo"
}

// Leetspeak for words people disguise on purpose.
function unleet(s: string): string {
  return s.replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/@/g, "a");
}

const near = (text: string, a: RegExp, b: RegExp, window = 60): string | null => {
  const ga = new RegExp(a.source, a.flags.includes("g") ? a.flags : a.flags + "g");
  for (const m of text.matchAll(ga)) {
    const start = Math.max(0, (m.index ?? 0) - window);
    const slice = text.slice(start, (m.index ?? 0) + m[0].length + window);
    const mb = slice.match(b);
    if (mb) return `${m[0]} … ${mb[0]}`;
  }
  return null;
};

// ---- Minors ---------------------------------------------------------------
const AGE_SELF = /\b(?:i'?m|im|i am|me|turning|just turned|age|aged)\s*:?\s*(1[0-7]|thirteen|fourteen|fifteen|sixteen|seventeen)\b(?!\s*(?:inch|in\b|"|”|cm|min|minute|hour|hr|day|week|month|mile|mi\b|km|percent|%|times|x\b|guys|people|bucks|dollars|k\b|lbs|pounds|ft|feet|'|years? ago|yrs? ago|inside|at heart|in dog|of|out of|\/))/;
const AGE_YO = /\b(1[0-7])\s*(?:y\/?o|yrs?\.? ?old|years? old|year old)\b/;
const PAST = /\b(was|when|back|at|since|age of|aged|turned|lost (?:it|my)|first time|in high school|years ago)\b/;
const SCHOOL_NOW = /\b(?:i'?m|im|i am)\s+(?:a\s+)?(?:in\s+)?(?:high ?school|middle school|9th grade|10th grade|11th grade|12th grade|freshman in high|sophomore in high|junior in high|senior in high)/;
const SEXUAL = /\b(sex|fuck|fucked|fucking|hook ?up|hooked up|nudes?|naked|dick|cock|blowjob|bj|suck|sucked|horny|cum|hard for)\b/;
const MINOR_OTHER = /\b(1[0-7]|thirteen|fourteen|fifteen|sixteen|seventeen)\s*(?:y\/?o|yrs? old|years? old|year old)\s+(?:boy|guy|kid|twink|neighbor|student|son|nephew)\b|\b(underage|jailbait|schoolboy)\b/;

function minors(t: string): TextHit | null {
  const other = t.match(MINOR_OTHER);
  if (other && SEXUAL.test(t)) return { category: "minor", level: "clear", reason: "A minor mentioned in a sexual context", match: other[0], urgent: true };
  const self = t.match(AGE_SELF) ?? t.match(AGE_YO);
  if (self) {
    const before = t.slice(Math.max(0, (self.index ?? 0) - 40), self.index ?? 0);
    const n = Number(self[1]) || NUM_WORDS[self[1]] || 0;
    // "When I was 16" is a story. "I'm 16" is not.
    if (n >= 10 && n < 18 && !PAST.test(before) && !/\b(was|when)\b/.test(t.slice(self.index ?? 0, (self.index ?? 0) + self[0].length + 30))) {
      return { category: "minor", level: "maybe", reason: "Says he might be under 18", match: self[0], urgent: true };
    }
  }
  const school = t.match(SCHOOL_NOW);
  if (school) return { category: "minor", level: "maybe", reason: "Says he's in school below college", match: school[0], urgent: true };
  return null;
}

// ---- Selling sex ----------------------------------------------------------
const SELL_STRONG = /\b(escort(?:ing|s)?|rent ?boy|incalls?|outcalls?|pay ?pig|paypig|findom|cashmeet|cash ?meet|sugar daddy needed|looking for (?:a )?sugar|my rates|rates are|rates start|per session|happy ending)\b/;
const MONEY = /(\$\s?\d{2,}|\b\d{2,}\s?(?:\$|dollars|bucks|usd)\b|\b(?:cash ?app|cashapp|venmo|zelle|paypal|apple ?pay|gift ?cards?|amazon card|crypto|bitcoin|btc|eth)\b|\b(?:generous|generosity|donation|donations|tribute|allowance|compensat\w*|pay you|pay me|paid|per hour|an hour|\/hr|hourly)\b)/;
const SEX_ACT = /\b(sex|fuck|fucking|bj|blowjob|blow job|head|suck|top you|bottom for|nudes?|pics|videos?|vids|content|session|meet ?up|hook ?up|massage|overnight|the night|for an hour|for the hour|service|services|play)\b/;
const MONEY_STRONG = /(\$\s?\d{2,}\s*(?:for|an? hour|\/hr|per)|\b(?:cash ?app|cashapp|venmo|zelle|gift ?cards?|amazon card|crypto|bitcoin)\b|\b(?:generous|generosity|tribute|allowance|compensat\w*|per hour|hourly)\b)/;
const SEX_STRONG = /\b(sex|fuck|fucking|bj|blowjob|blow job|suck you|suck me|top you|bottom for|nudes|overnight|for an hour)\b/;
// Ordinary money talk that should never read as selling sex.
const MONEY_OK = /\b(i paid|we paid|split|venmo you back|venmo me back|pay you back|pay me back|owe you|tickets?|tab|bill|rent\b|uber|lyft|gas money|dinner|drinks|brunch|cover charge|tip|tips|groceries|my paycheck|salary|tuition|loans?)\b/;

function solicitation(t: string): TextHit | null {
  const strong = t.match(SELL_STRONG);
  if (strong) return { category: "solicitation", level: "clear", reason: "Offering or asking for paid sex", match: strong[0] };
  const strongPair = near(t, MONEY_STRONG, SEX_STRONG, 50);
  if (strongPair && !MONEY_OK.test(t)) return { category: "solicitation", level: "clear", reason: "Money offered or asked for sex", match: strongPair };
  const pair = near(t, MONEY, SEX_ACT, 50);
  if (pair && !MONEY_OK.test(t)) return { category: "solicitation", level: "maybe", reason: "Money and sex in the same message", match: pair };
  return null;
}

// ---- Drugs ----------------------------------------------------------------
const CHEM_CLEAR = /\b(pnp|p n p|party (?:and|n|&) play|party ?n ?play|chemsex|chem sex|chemfun|chem fun|tina party|wired and horny|blow clouds|(?:slam|slamming|slammed) (?:tina|t|meth|party|session|and (?:fuck|play))|clouds? (?:and|n) (?:fun|play|fuck))\b/;
// "parTy" with a capital T is long-standing code for meth. Checked on the raw text, case intact.
const CAPITAL_T = /\bpar[T]y(?:ing)?\b|\b(?:T|G) and (?:play|fun|sex)\b/;
// Words that only mean drugs, versus words that usually mean something else (ice, crystal, G, X, bars).
const DRUG = /\b(crystal meth|meth|ghb|gbl|molly|mdma|ecstasy|cocaine|ketamine|special k|k ?hole|shrooms|lsd|xanax|xannies|percs|percocet|oxys?|oxycodone|fent|fentanyl)\b/;
const DRUG_AMBIG = /\b(tina|ice|crystal|g|x|coke|blow|ket|acid|bars|lean|k)\b/;
const DRUG_HARD = /\b(crystal meth|meth|ghb|gbl|molly|mdma|ecstasy|cocaine|ketamine|fentanyl|fent)\b/;
const DEAL = /\b(sell|selling|sold|for sale|plug|connect|holding|got some|hook (?:you|me) up|who has|who's got|whos got|anyone have|anyone got|looking for|need some|dealer|re-?up|delivery|deliver|grams?|eighths?|8ball|8 ball|bump|bumps|dm for|hit me up for)\b/;
const DRUG_OK = /\b(tina turner|tina fey|tina belcher|aunt tina|ice cream|ice cold|ice skating|on ice|iced|crystal clear|crystal ball|crystals?\b(?= shop| healing)|crystal pepsi|x factor|x men|x-men|twitter|acid wash|acidic|bars? (?:in|on|downtown|crawl|night|hop)|gay bars?|sports bars?|blow (?:dry|out|up|bubbles|a kiss|my mind|me away|your mind)|blowout|coke zero|diet coke|coca)\b/;

function drugs(t: string, raw: string): TextHit | null {
  const clean = t.replace(new RegExp(DRUG_OK.source, "g"), " ");
  const chem = clean.match(CHEM_CLEAR) ?? raw.match(CAPITAL_T);
  if (chem) return { category: "drugs", level: "clear", reason: "Drug-fueled sex (party and play)", match: chem[0] };
  const deal = near(clean, DRUG, DEAL, 40);
  if (deal) return { category: "drugs", level: "clear", reason: "Buying, selling or looking for drugs", match: deal };
  const ambig = near(clean, DRUG_AMBIG, DEAL, 25);
  if (ambig) return { category: "drugs", level: "maybe", reason: "Might be about buying drugs", match: ambig };
  const hard = clean.match(DRUG_HARD);
  if (hard) return { category: "drugs", level: "maybe", reason: "Hard drug mentioned", match: hard[0] };
  return null;
}

// ---- Spam, promo, contact -----------------------------------------------------
const PAID_PROMO = /\b(onlyfans|only fans|0nlyfans|fansly|justfor\.?fans|jff|fancentro|manyvids|my ?of\b|link in bio|linktr\.?ee|beacons\.ai|allmylinks|cash\.app|subscribe to my|promo code|use my code|dm me for prices)\b/;
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|me|ly|xyz|app|link|site|club|info|biz|tv|gg)\b(?:\/\S*)?/;
const URL_OK = /\b(homosocial\.net|google\.com\/maps|maps\.app\.goo\.gl|maps\.apple\.com|eventbrite\.com|ticketmaster\.com|youtube\.com|youtu\.be|spotify\.com|open\.spotify\.com|instagram\.com|tiktok\.com|imdb\.com|yelp\.com|opentable\.com|resy\.com|meetup\.com|partiful\.com|facebook\.com\/events)\b/;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

function spam(t: string, surface: Surface): TextHit | null {
  const promo = t.match(PAID_PROMO);
  if (promo) return { category: "spam", level: "clear", reason: "Promoting paid content or links", match: promo[0] };
  if (surface === "dm") return null; // Two consenting adults can swap numbers and links.
  const phone = t.match(PHONE);
  if (phone) return { category: "contact", level: "clear", reason: "Phone number posted where the whole Circle can see", match: phone[0] };
  const url = t.match(URL);
  if (url && !URL_OK.test(url[0])) return { category: "spam", level: "maybe", reason: "Outside link", match: url[0] };
  return null;
}

// ---- Hate and threats ---------------------------------------------------------
// In-community words (queer, fag, etc.) are used affectionately here and are
// never flagged. Racial slurs and dehumanizing exclusions are.
const SLURS = /\b(n[i1!]gg(?:er|a)s?|n[i1]g\b|chinks?|gooks?|spics?|wetbacks?|beaners?|kikes?|towel ?heads?|sand ?n\w+|trann(?:y|ies)|shemales?|he-?shes?|retards?|retarded)\b/;
const NO_X = /\bno (?:fats?|fems?|femmes?|blacks?|asians?|rice|spice|curry|chocolate|latinos?|mexicans?|indians?|arabs?|trans|old guys|olds|chubs|bears|twinks|bottoms)\b/g;
const X_ONLY = /\b(?:whites?|white guys|masc|masc4masc|masc 4 masc|straight acting|str8 acting) only\b|\bnot into (?:blacks?|asians?|latinos?|indians?|arabs?)\b/;
const THREAT_CLEAR = /\b(kys|kill yourself|go die|hope you die)\b/;
const THREAT_MAYBE = /\bi(?:'ll| will| am going to|'m gonna|m gonna) (?:kill|hurt|beat|stab|shoot) you\b/;
const OUTING = /\b(i(?:'ll| will) (?:tell|show|send (?:this|it) to) your (?:wife|girlfriend|boss|job|work|mom|mother|dad|family|church)|i know where you (?:live|work)|i(?:'ll| will) out you|post your (?:nudes|pics|photos))\b/;

function hate(t: string, surface: Surface): TextHit | null {
  const outing = t.match(OUTING);
  if (outing) return { category: "threat", level: "clear", reason: "Threatening to out or expose someone", match: outing[0], urgent: true };
  const threat = t.match(THREAT_CLEAR);
  if (threat) return { category: "threat", level: "clear", reason: "Telling someone to hurt himself", match: threat[0] };
  const maybeThreat = t.match(THREAT_MAYBE);
  if (maybeThreat && !/\b(lol|lmao|haha|jk|if you spoil|if you're late|with kindness)\b/.test(t)) return { category: "threat", level: "maybe", reason: "Possible threat", match: maybeThreat[0] };
  if (surface !== "dm") {
    const list = [...t.matchAll(NO_X)].map((m) => m[0]);
    const only = t.match(X_ONLY);
    if (only || list.length >= 2) return { category: "hate", level: "clear", reason: "Exclusion by race, body or gender", match: only?.[0] ?? list.join(", ") };
    if (list.length === 1 && surface === "profile") return { category: "hate", level: "maybe", reason: "Possible exclusion", match: list[0] };
  }
  const slur = t.match(SLURS);
  if (slur) return { category: "hate", level: "maybe", reason: "Possible slur", match: slur[0] };
  return null;
}

// Every rule, worst first. Returns the most serious hit, or null.
export function checkText(input: string, surface: Surface): TextHit | null {
  const raw = (input ?? "").slice(0, 5000);
  if (!raw.trim()) return null;
  const t = normalize(raw);
  const u = unleet(t);
  const hits = [minors(t), hate(t, surface), solicitation(t) ?? solicitation(u), drugs(t, raw) ?? drugs(u, raw), spam(t, surface)].filter(Boolean) as TextHit[];
  if (!hits.length) return null;
  const rank = (h: TextHit) => (h.urgent ? 0 : 2) + (h.level === "clear" ? 0 : 1);
  return hits.sort((a, b) => rank(a) - rank(b))[0];
}

// Self-harm: never blocked, never reported to anyone. He just sees where help is.
const SELF_HARM = /\b(kill myself|end it all|want to die|wanna die|don'?t want to be here anymore|suicid\w*|hurt myself|cut myself)\b/;
export function needsCare(input: string): boolean {
  const t = normalize(input ?? "");
  return SELF_HARM.test(t) && !/\b(lol|lmao|haha|dying laughing|i'?m dead|killing me|kill myself laughing)\b/.test(t);
}
