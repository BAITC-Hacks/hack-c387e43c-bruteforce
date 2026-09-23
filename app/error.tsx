"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel empty">
      <h1>We couldn’t load this view</h1>
      <p>
        Please retry. Your saved tasks and proposals are still in the local
        database.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
