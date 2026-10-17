import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display/wght";
import "@fontsource-variable/instrument-sans/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homosocial",
  description:
    "A reality show where you're the cast and there's no audience. Thirty gay, bi, trans and queer guys near you, eight weekly episodes, one Finale.",
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
  themeColor: "#160C24",
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
