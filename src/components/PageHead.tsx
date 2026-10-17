import TopBar from "./TopBar";

export default function PageHead({
  title,
  tag,
  children,
  right,
}: {
  title: string;
  tag?: React.ReactNode;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="page-head">
      <TopBar right={right} />
      <div className="wrap page-head-body">
        {tag && <div className="chyron">{tag}</div>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </section>
  );
}
