import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel empty">
      <h1>This page isn’t available</h1>
      <p>The task may be private, or this link may be out of date.</p>
      <Link className="button" href="/">
        Back to catalog
      </Link>
    </section>
  );
}
