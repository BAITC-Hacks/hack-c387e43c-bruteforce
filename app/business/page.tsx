import Link from "next/link";
import { allTasks, proposalsFor } from "@/lib/db";
import { currentIdentity } from "@/lib/demo-identity";
import { scoreCard } from "@/lib/scoring";
import { ProposalCard } from "@/components/proposal-card";
import { ScoreBadge } from "@/components/score-panel";

export default async function Business({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const identity = await currentIdentity();
  if (identity?.role !== "business")
    return (
      <section className="panel empty">
        <h1>Your business workspace</h1>
        <p>
          Choose a business in the demo identity selector to manage its tasks
          and proposals.
        </p>
      </section>
    );
  const tasks = allTasks()
    .filter((task) => task.businessId === identity.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const requested = (await searchParams).task;
  const active = tasks.find((task) => task.id === requested) ?? tasks[0];
  const proposals = active ? proposalsFor(identity, active.id) : [];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{identity.name} · Business workspace</div>
          <h1>A good brief is just the start.</h1>
          <p>Keep your projects moving and meet the teams ready to help.</p>
        </div>
        <Link className="button" href="/tasks/new">
          + Create task
        </Link>
      </div>
      {!tasks.length ? (
        <section className="panel empty">
          <h2>Your first opportunity starts here</h2>
          <p>Describe a challenge and turn it into a project brief.</p>
          <Link className="button" href="/tasks/new">
            Create your first task
          </Link>
        </section>
      ) : (
        <div className="workspace-layout">
          <aside className="task-list" aria-label="Your tasks">
            {tasks.map((task) => (
              <Link
                key={task.id}
                className={`panel workspace-task ${active?.id === task.id ? "selected" : ""}`}
                href={`/business?task=${task.id}`}
              >
                <div className="spread">
                  <span className="eyebrow">
                    {task.publishedAt ? "Published" : "Private draft"}
                  </span>
                  <strong>
                    {scoreCard(task.confirmed?.card ?? null).total}/100
                  </strong>
                </div>
                <h3>{task.working.card.title || "Untitled draft"}</h3>
                <ScoreBadge
                  score={scoreCard(task.confirmed?.card ?? null).total}
                />
                <p>
                  {task.proposalCount} proposals{" "}
                  <span aria-hidden="true">→</span>
                </p>
              </Link>
            ))}
          </aside>
          <section aria-label="Task proposals">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Your next collaborators</div>
                <h2>{active.working.card.title || "Untitled draft"}</h2>
              </div>
              <Link className="text-link" href={`/tasks/${active.id}/edit`}>
                Edit task ↗
              </Link>
            </div>
            <p className="muted">
              Compare the submitted ideas, plans, and skills. Every choice is
              yours; selecting one team does not close the project.
            </p>
            {active.publishedAt && (
              <p>
                <Link className="text-link" href={`/tasks/${active.id}`}>
                  View public task →
                </Link>
              </p>
            )}
            {!proposals.length ? (
              <div className="panel empty">
                <h3>
                  {active.publishedAt
                    ? "The next idea could be on its way"
                    : "Publish your task to receive proposals"}
                </h3>
                <p>
                  {active.publishedAt
                    ? "Student teams can apply from the task page at any readiness level."
                    : "Confirm your brief and publish it when you’re ready."}
                </p>
              </div>
            ) : (
              proposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} canDecide />
              ))
            )}
          </section>
        </div>
      )}
    </>
  );
}
