import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError, catalog, getTask, teams } from "@/lib/db";
import { currentIdentity } from "@/lib/demo-identity";
import { ProposalForm } from "@/components/proposal-form";
import { ScorePanel } from "@/components/score-panel";

export default async function TaskDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const identity = await currentIdentity();
  let task;
  try {
    task = getTask((await params).id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const owner =
    identity?.role === "business" && identity.id === task.businessId;
  if (!task.publishedAt && !owner) notFound();
  const backParam = (await searchParams).back;
  const back =
    typeof backParam === "string" &&
    (backParam === "/" || backParam.startsWith("/?"))
      ? backParam
      : "/";
  const c = task.confirmed?.card;
  if (!c)
    return (
      <section className="panel empty">
        <h1>Your draft is still taking shape</h1>
        <p>Review and confirm the details before publishing.</p>
        <Link className="button" href={`/tasks/${task.id}/edit`}>
          Edit draft
        </Link>
      </section>
    );
  const entries = catalog();
  const position = entries.findIndex((entry) => entry.id === task.id) + 1;
  const show = (value: string) => value.trim() || "Not provided";
  const success =
    c.successMode === "metric"
      ? [c.successMetric, c.successComparison, c.successValue, c.successUnit]
          .filter(Boolean)
          .join(" · ")
      : [c.successAction, c.successOutcome].filter(Boolean).join(" → ");
  const section = (title: string, fields: [string, string][]) => (
    <section className="panel brief-section">
      <h2>{title}</h2>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={!value ? "missing-value" : ""}>{show(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
  return (
    <>
      <Link className="back-link" href={back}>
        ← Back to catalog
      </Link>
      <div className="page-heading">
        <div>
          <span className="topic-label">{task.confirmed!.topic}</span>
          <h1>{c.title}</h1>
          <p>
            {task.businessName} <span className="dot-separator">·</span>{" "}
            {task.publishedAt
              ? "Open to every student team"
              : "Private · not published"}
          </p>
        </div>
        {owner && (
          <div className="actions">
            <Link className="button secondary" href={`/tasks/${task.id}/edit`}>
              Edit task
            </Link>
            <Link className="button" href={`/business?task=${task.id}`}>
              Review proposals ({task.proposalCount})
            </Link>
          </div>
        )}
      </div>
      <div className="detail-layout">
        <div>
          {section("The challenge", [
            ["Current situation", c.context],
            ["Change needed", c.need],
            ["Intended users", c.users],
          ])}
          {section("What the team will work with", [
            ["Material name", c.materialsName],
            ["Contents", c.materialsDescription],
            ["Access", c.materialsAccess],
          ])}
          {section("The result we’re aiming for", [
            ["Deliverable type", c.deliverableType],
            ["Expected result", c.deliverableDescription],
            ["Success criterion", success],
            ["How it will be checked", c.verification],
          ])}
          {section("Working together", [
            ["Delivery boundary", c.deadline],
            ["Technology / access", c.boundary],
            ["Contact", c.contact],
            ["Consultation", c.consultation],
            ["Feedback", c.feedback],
          ])}
          {identity?.role === "team" && task.publishedAt ? (
            <ProposalForm
              taskId={task.id}
              team={teams().find((team) => team.id === identity.id)!}
            />
          ) : (
            !owner && (
              <div className="panel form-section">
                <h2>Interested in this challenge?</h2>
                <p>
                  Choose a student team in the demo identity selector to submit
                  a proposal.
                </p>
              </div>
            )
          )}
        </div>
        <aside>
          <div className="panel detail-action">
            <span className="eyebrow">Open opportunity</span>
            <h2>
              {task.proposalCount}{" "}
              {task.proposalCount === 1 ? "proposal" : "proposals"}
            </h2>
            <p>
              Low readiness never prevents an application. Ask questions and
              propose your approach.
            </p>
            {identity?.role === "team" && (
              <a className="button full-width" href="#proposal">
                Submit proposal ↓
              </a>
            )}
            {position > 0 && (
              <p className="rank" data-testid="catalog-position">
                Position {position} of {entries.length} in all published tasks
              </p>
            )}
          </div>
          <ScorePanel card={c} />
        </aside>
      </div>
    </>
  );
}
