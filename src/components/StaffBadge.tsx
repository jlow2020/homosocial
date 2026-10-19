// The title an admin wears on his card, with a little gold crown.
export default function StaffBadge({ title }: { title: string }) {
  return (
    <span className="staff-badge" title="Runs Homosocial">
      <svg viewBox="0 0 24 18" width="18" height="14" aria-hidden="true" className="staff-crown">
        <path
          d="M2 5.5l5 4.5 5-8 5 8 5-4.5-2 10.5H4z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="2" cy="5" r="1.8" fill="currentColor" />
        <circle cx="12" cy="1.8" r="1.8" fill="currentColor" />
        <circle cx="22" cy="5" r="1.8" fill="currentColor" />
      </svg>
      {title}
    </span>
  );
}
