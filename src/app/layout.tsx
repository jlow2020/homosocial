import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display/wght";
import "@fontsource-variable/instrument-sans/wght.css";
import "./globals.css";
import HashSignIn from "@/components/HashSignIn";
import SiteFooter from "@/components/SiteFooter";
import { shareMetadata } from "@/lib/og";

export const metadata: Metadata = {
  title: "Homosocial",
  description:
    "A social game for gay, bi, trans and queer men, played in seasons, like your favorite reality show, minus the cameras. Thirty guys near you, eight weeks, one Finale.",
  metadataBase: new URL("https://homosocial.net"),
  ...shareMetadata("show"),
};

export const viewport: Viewport = {
  themeColor: "#160C24",
};

metadata.manifest = "/manifest.json";
metadata.appleWebApp = { capable: true, statusBarStyle: "black-translucent", title: "Homosocial" };
metadata.icons = { apple: "/apple-touch-icon.png" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <HashSignIn />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
