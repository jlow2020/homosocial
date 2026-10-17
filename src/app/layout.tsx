import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display/wght";
import "@fontsource-variable/instrument-sans/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homosocial",
  description:
    "A reality show-style game for gay, bi, trans and queer men, with no cameras and no audience. Thirty guys near you, eight weekly episodes, one Finale.",
  metadataBase: new URL("https://homosocial.net"),
  openGraph: {
    title: "Homosocial",
    description: "A reality show-style game with no cameras and no audience. Make friends, do fun stuff, maybe find a boyfriend.",
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
