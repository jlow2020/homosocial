import Link from "next/link";
import { LEGAL } from "@/lib/legal";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Homosocial", links: [["/about", "About"], ["/contact", "Help and contact"]] },
  { title: "Community", links: [["/guidelines", "Community Guidelines"], ["/safety", "Safety"]] },
  { title: "Legal", links: [["/terms", "Terms"], ["/privacy", "Privacy"], ["/biometrics", "Biometric and ID Notice"], ["/copyright", "Copyright"]] },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <span className="wordmark">
            <span className="mark-ring" aria-hidden="true" />
            Homosocial
          </span>
          <span className="fine">Good company. Questionable behavior.</span>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} className="footer-col" aria-label={c.title}>
            <p className="footer-h">{c.title}</p>
            <ul>
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="wrap footer-bottom">
        <span>© {year} {LEGAL.company}</span>
        <span>18+ only · Made in Sarasota, Florida</span>
        <span>In an emergency, call 911</span>
      </div>
    </footer>
  );
}
