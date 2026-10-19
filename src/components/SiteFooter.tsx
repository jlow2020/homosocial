import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <span className="wordmark">Homosocial</span>
          <span className="fine">Good company. Questionable behavior.</span>
        </div>
        <nav className="footer-links" aria-label="About and legal">
          <Link href="/about">About</Link>
          <Link href="/guidelines">Community Guidelines</Link>
          <Link href="/safety">Safety</Link>
          <Link href="/contact">Help and contact</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/biometrics">Biometric and ID Notice</Link>
          <Link href="/copyright">Copyright</Link>
        </nav>
        <p className="fine footer-legal">
          © {year} {LEGAL.company}. 18+ only. Homosocial is a social game, not a background check service. In an emergency, call 911.
        </p>
      </div>
    </footer>
  );
}
