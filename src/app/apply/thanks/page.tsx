import type { Metadata } from "next";
import Link from "next/link";
import { SEASON } from "@/lib/season";

export const metadata: Metadata = {
  title: "Application sent | Homosocial",
};

export default function Thanks() {
  return (
    <main className="thanks">
      <header className="topbar wrap">
        <Link href="/" className="wordmark" style={{ textDecoration: "none" }}>
          homosocial
        </Link>
      </header>
      <div className="thanks-body wrap">
        <h1>Application sent.</h1>
        <p>
          We&apos;ll email you to set up a quick video call before{" "}
          {SEASON.starts}. Once that&apos;s done, you&apos;re in.
        </p>
        <p>
          Know a guy who needs this? Send him homosocial.net. Spots are capped
          at {SEASON.spots}.
        </p>
        <Link href="/" className="btn btn-pink">
          Back to homosocial.net
        </Link>
      </div>
    </main>
  );
}
