// A numbered badge for the first guys in. Theirs for good.
export default function FounderBadge({ no }: { no: number }) {
  return (
    <span className="founder-badge" title={`One of the first guys on Homosocial. Founder #${no}.`}>
      <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
        <path d="M10 1.5l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L10 14.8l-5.4 2.9 1.2-5.9L1.4 7.7l6-.7z" fill="currentColor" />
      </svg>
      Founder #{no}
    </span>
  );
}
