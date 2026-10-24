import type { Metadata } from "next";

// The three link-preview cards. Each page load picks one at random, so every
// fresh share can look different. Add ?card=show, ?card=tease or ?card=seats
// to a link to pin one (handy for a specific post).
const CARDS = {
  show: { url: "/og/show.png?v=2", alt: "Homosocial. A social game for gay, bi, trans and queer men. 30 guys, 8 weeks, 1 Finale." },
  tease: { url: "/og/tease.png?v=1", alt: "This week's drop: Who in your Circle would you call at 2am? Answers hidden until you post yours." },
  seats: { url: "/og/seats.png?v=2", alt: "Join a Circle. Starts with 2, up to 30." },
} as const;
type CardName = keyof typeof CARDS;
const NAMES = Object.keys(CARDS) as CardName[];

const TITLE = "Homosocial";
const DESCRIPTION =
  "A social game for gay, bi, trans and queer men. Meet 30 guys, play a new game every Monday for 8 weeks. Make friends, maybe find a boyfriend.";

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
