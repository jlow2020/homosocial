"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Saved to the Home Screen, Homosocial runs without the browser's buttons.
// This bar gives back the basics: back, home, profile. Only shows in that mode.
const APP_PAGES = ["/circle", "/profile", "/admin", "/me"];

export default function AppBar() {
  const path = usePathname();
  const router = useRouter();
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const check = () => setStandalone(mq.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    check();
    mq.addEventListener?.("change", check);
    return () => mq.removeEventListener?.("change", check);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("has-appbar", standalone && APP_PAGES.some((p) => path.startsWith(p)));
  }, [standalone, path]);

  if (!standalone || !APP_PAGES.some((p) => path.startsWith(p))) return null;
  const atHome = path === "/circle";
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/circle");
  };

  return (
    <nav className="appbar" aria-label="App">
      <button className="appbar-item" onClick={back} disabled={atHome} aria-label="Back">
        <span aria-hidden="true">‹</span>
        Back
      </button>
      <Link href="/circle" className={atHome || path.startsWith("/circle") ? "appbar-item on" : "appbar-item"}>
        <span aria-hidden="true">◎</span>
        Home
      </Link>
      <Link href="/profile" className={path.startsWith("/profile") ? "appbar-item on" : "appbar-item"}>
        <span aria-hidden="true">●</span>
        Profile
      </Link>
    </nav>
  );
}
