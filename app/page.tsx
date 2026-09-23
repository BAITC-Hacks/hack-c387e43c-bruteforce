import Link from "next/link";
import { businesses, catalog } from "@/lib/db";
import { currentIdentity } from "@/lib/demo-identity";
import { topics } from "@/lib/schemas";
import { tiers } from "@/lib/scoring";
import { ScoreBadge } from "@/components/score-panel";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; tier?: string }>;
}) {
  const query = await searchParams;
  const topic = typeof query.topic === "string" ? query.topic : "";
  const tier = typeof query.tier === "string" ? query.tier : "";
  const tasks = catalog(topic, tier);
  const all = catalog();
  const identity = await currentIdentity();
  const returnParams = new URLSearchParams();
  if (topic) returnParams.set("topic", topic);
  if (tier) returnParams.set("tier", tier);
  const back = `/${returnParams.size ? `?${returnParams}` : ""}`;
  return (
    <>
      <section className="catalog-hero">
        <div>
          <div className="eyebrow">A little ambition goes a long way</div>
          <h1>
            Real problems.
            <br />
            <span>Fresh perspectives.</span>
          </h1>
          <p>
            Find a business problem your team can solve.
            <br />
            Bring your skills. Build something that matters.
          </p>
          <div className="hero-foot">
            <span className="live-dot" />
            {all.length} open projects<span className="dot-separator">·</span>
            Every team is welcome
          </div>
        </div>
        <aside className="hero-note">
          <span className="note-icon" aria-hidden="true">
            ↗
          </span>
          <h2>
            A clearer brief.
            <br />A better beginning.
          </h2>
          <p>
            Businesses earn visibility by sharing useful details. Teams choose
            where they can make a difference.
          </p>
          <Link
            href={identity?.role === "business" ? "/tasks/new" : "#projects"}
          >
            {identity?.role === "business"
              ? "Share a challenge"
              : "Explore the projects"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </section>
      <section id="projects" aria-label="Project catalog">
        <div className="section-heading">
          <div>
            <div className="eyebrow">The opportunity board</div>
            <h2>Explore projects</h2>
          </div>
          <span className="muted small">Sorted by confirmed readiness ↓</span>
        </div>
        <form className="filters" method="get">
          <label>
            Topic
            <select name="topic" aria-label="Topic" defaultValue={topic}>
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Readiness
            <select name="tier" aria-label="Readiness" defaultValue={tier}>
              <option value="">All readiness levels</option>
              {tiers.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <button className="button secondary" type="submit">
            Apply filters
          </button>
          {(topic || tier) && (
            <Link className="text-link" href="/">
              Clear filters
            </Link>
          )}
          <span className="result-count">
            {tasks.length} {tasks.length === 1 ? "project" : "projects"}
            {topic || tier ? " match your filters" : " to explore"}
          </span>
        </form>
        {!businesses().length ? (
          <div className="empty panel">
            <h3>Let’s set up your local demo</h3>
            <p>
              Run <code>npm run seed</code> in the application directory, then
              refresh. It creates five projects and five student teams.
            </p>
          </div>
        ) : !tasks.length ? (
          <div className="empty panel">
            <h3>No projects match just yet</h3>
            <p>Try a different topic or readiness level.</p>
            <Link className="button secondary" href="/">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="task-grid">
            {tasks.map((task, index) => (
              <article
                key={task.id}
                className={`panel task-card ${task.score.total >= 90 ? "priority-card" : ""}`}
              >
                <div className="spread">
                  <span className="topic-label">{task.topic}</span>
                  <span className="project-symbol" aria-hidden="true">
                    {["◈", "◫", "⌁", "◇", "◒"][index % 5]}
                  </span>
                </div>
                <div className="task-copy">
                  <p className="business-name">{task.businessName}</p>
                  <h3>
                    <Link
                      href={`/tasks/${task.id}?back=${encodeURIComponent(back)}`}
                    >
                      {task.card.title}
                    </Link>
                  </h3>
                  <p>{task.card.need || task.card.context}</p>
                </div>
                <div className="readiness-row">
                  <div>
                    <strong>{task.score.total}</strong>
                    <span> / 100 readiness</span>
                  </div>
                  <ScoreBadge score={task.score.total} />
                </div>
                <progress
                  value={task.score.total}
                  max={100}
                  aria-label={`${task.card.title} readiness`}
                />
                <div className="card-footer">
                  <span>
                    {task.proposalCount}{" "}
                    {task.proposalCount === 1 ? "proposal" : "proposals"}
                  </span>
                  <Link
                    className="text-link"
                    href={`/tasks/${task.id}?back=${encodeURIComponent(back)}`}
                  >
                    View task <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="catalog-note">
          An open invitation, at every stage. Even a brief that needs
          clarification is ready for a conversation.
        </p>
      </section>
    </>
  );
}
