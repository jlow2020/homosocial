type Props = {
  spots: number;
  taken: number;
  label: string;
  sublabel: string;
};

// The Circle, drawn literally: one seat per spot, filled as guys get approved.
export default function CircleRing({ spots, taken, label, sublabel }: Props) {
  const size = 360;
  const c = size / 2;
  const r = 150;
  const dot = 11;
  const seats = Array.from({ length: spots }, (_, i) => {
    const a = (i / spots) * Math.PI * 2 - Math.PI / 2;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a), filled: i < taken, i };
  });
  const open = Math.max(spots - taken, 0);

  return (
    <figure className="ring">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${taken} of ${spots} spots taken, ${open} open`}
      >
        {seats.map((s) => (
          <circle
            key={s.i}
            cx={s.x}
            cy={s.y}
            r={dot}
            className={s.filled ? "seat seat-taken" : "seat"}
            style={{ animationDelay: `${s.i * 22}ms` }}
          />
        ))}
      </svg>
      <figcaption className="ring-center">
        <span className="ring-label">{label}</span>
        <span className="ring-sub">{sublabel}</span>
        <span className="ring-count">
          {open === spots
            ? `${spots} open spots`
            : `${open} of ${spots} spots left`}
        </span>
      </figcaption>
    </figure>
  );
}
