import type { Metadata } from "next";
import Link from "next/link";
import ApplyForm from "./ApplyForm";
import { SEASON } from "@/lib/season";

export const metadata: Metadata = {
  title: `Apply for ${SEASON.name} | Homosocial`,
};

export default function ApplyPage() {
  return (
    <main className="apply-page">
      <section className="apply-head">
        <header className="topbar wrap">
          <Link href="/" className="wordmark">
            homosocial
          </Link>
        </header>
        <div className="wrap">
          <h1>Apply for {SEASON.name}</h1>
          <p>
            {SEASON.spots} spots in {SEASON.areaShort}. Starts {SEASON.starts}.
            Takes about three minutes. After you apply, you&apos;ll get a quick
            video call so we know everyone in the Circle is real.
          </p>
        </div>
      </section>
      <ApplyForm />
    </main>
  );
}
