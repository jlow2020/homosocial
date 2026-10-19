import type { Metadata } from "next";

// The three link-preview cards. Each page load picks one at random, so every
// fresh share can look different. Add ?card=show, ?card=tease or ?card=seats
// to a link to pin one (handy for a specific post).
const CARDS = {
  show: { url: "/og/show.png?v=1", alt: "Homosocial: now casting. 30 guys, 8 weeks, 1 Finale." },
  tease: { url: "/og/tease.png?v=1", alt: "This week's drop: Who in your Circle would you call at 2am? Answers hidden until you post yours." },
  seats: { url: "/og/seats.png?v=1", alt: "Grab a seat. 30 seats, kicks off at 9." },
} as const;
type CardName = keyof typeof CARDS;
const NAMES = Object.keys(CARDS) as CardName[];

const TITLE = "Homosocial";
const DESCRIPTION =
  "A social game for gay, bi, trans and queer men, played in Seasons. Like your favorite reality show, minus the cameras. Make friends, do fun stuff, maybe find a boyfriend.";

export function pickCard(choice?: string | string[]): CardName {
  const c = Array.isArray(choice) ? choice[0] : choice;
  if (c && (NAMES as string[]).includes(c)) return c as CardName;
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

export function shareMetadata(card: CardName, title = TITLE, description = DESCRIPTION, path = "/"): Pick<Metadata, "openGraph" | "twitter"> {
  const img = { url: CARDS[card].url, width: 1200, height: 630, alt: CARDS[card].alt };
  return {
    openGraph: { title, description, url: `https://homosocial.net${path}`, siteName: "Homosocial", type: "website", images: [img] },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}
