// The Circle: thirty seats around a ring. Taken seats glow; his is gold.
export default function SeatRing({ capacity = 30, taken = 0, photo, label }: { capacity?: number; taken?: number; photo?: string | null; label?: string }) {
  const r = 150;
  return (
    <div className="seat-ring">
      <svg className="ring" viewBox="-180 -180 360 360" role="img" aria-label={label ?? `${taken} of ${capacity} seats taken`}>
        <circle className="ring-track" r={r} />
        {Array.from({ length: capacity }, (_, i) => {
          const a = (i / capacity) * Math.PI * 2 - Math.PI / 2;
          const cls = i === 0 && taken > 0 ? "seat-dot seat-mine" : i < taken ? "seat-dot seat-taken-dot" : "seat-dot seat-open";
          return <circle key={i} className={cls} cx={Math.round(Math.cos(a) * r * 100) / 100} cy={Math.round(Math.sin(a) * r * 100) / 100} r={11} style={{ animationDelay: `${200 + i * 40}ms` }} />;
        })}
      </svg>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="seat-ring-photo" src={photo} alt="" />
      )}
    </div>
  );
}
