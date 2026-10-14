import Link from "next/link";

export default function PageHead({
  title,
  children,
  right,
}: {
  title: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="apply-head">
      <header className="topbar wrap">
        <Link href="/" className="wordmark">
          homosocial
        </Link>
        {right}
      </header>
      <div className="wrap">
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </section>
  );
}
