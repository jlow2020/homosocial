import type { Metadata } from "next";

export const metadata: Metadata = { title: "Signing in | Homosocial", robots: { index: false } };

// The sign-in itself happens in HashSignIn, which the root layout renders.
export default function FinishPage() {
  return (
    <main className="wrap" style={{ paddingTop: 120 }}>
      <p className="status" aria-live="polite">Signing you in</p>
    </main>
  );
}
