import type { Metadata, Viewport } from "next";
import "@fontsource-variable/anybody/standard.css";
import "@fontsource-variable/figtree/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homosocial",
  description:
    "Your favorite people are still strangers. Homosocial puts 40 gay, bi, and queer guys from the same corner of Sarasota into one group for eight weeks.",
  metadataBase: new URL("https://homosocial.net"),
  openGraph: {
    title: "Homosocial",
    description: "Your favorite people are still strangers.",
    url: "https://homosocial.net",
    siteName: "Homosocial",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#143A36",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
