import type { Metadata } from "next";
import HashSignIn from "@/components/HashSignIn";

export const metadata: Metadata = { title: "Signing in | Homosocial", robots: { index: false } };

export default function FinishPage() {
  return (
    <main className="wrap" style={{ paddingTop: 120 }}>
      <HashSignIn always />
      <p className="status" aria-live="polite">Signing you in</p>
    </main>
  );
}
