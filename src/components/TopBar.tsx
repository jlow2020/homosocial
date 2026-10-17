import Link from "next/link";

export default function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="topbar wrap">
      <Link href="/" className="wordmark" aria-label="Homosocial home">
        <span className="onair" aria-hidden="true" />
        Homosocial
      </Link>
      {right}
    </header>
  );
}
