import Link from "next/link";
import PageHead from "@/components/PageHead";
import { LEGAL } from "@/lib/legal";

export type Section = { id: string; title: string; body: React.ReactNode };

// One layout for every legal page: plain-English summary up top, table of
// contents, then the numbered sections.
export default function LegalPage({
  title,
  lede,
  summary,
  sections,
  dated = true,
}: {
  title: string;
  lede: React.ReactNode;
  summary?: React.ReactNode[];
  sections: Section[];
  dated?: boolean;
}) {
  return (
    <main className="apply-page legal">
      <PageHead title={title} right={<Link href="/me" className="topbar-link">Sign in</Link>}>
        {lede}
      </PageHead>
      <div className="wrap prose">
        {dated && <p className="fine">Effective {LEGAL.effective}. {LEGAL.company}.</p>}
        {summary && (
          <aside className="legal-summary">
            <p className="eyebrow">The short version</p>
            <ul>
              {summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <p className="fine">The short version is a guide. The full text below is what counts.</p>
          </aside>
        )}
        {sections.length > 3 && (
          <nav className="legal-toc" aria-label="Contents">
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="legal-section">
            <h2>
              {sections.length > 3 && <span className="legal-no">{i + 1}.</span>} {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </div>
    </main>
  );
}

export function Mail({ to }: { to: string }) {
  return <a href={`mailto:${to}`}>{to}</a>;
}
