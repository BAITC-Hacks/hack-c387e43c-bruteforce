"use client";
import { useState } from "react";
import Link from "next/link";
import { Proposal, Milestone, Decision } from "@/lib/schemas";
import { message, request } from "@/lib/client";

export function ProposalCard({
  proposal,
  canDecide = false,
}: {
  proposal: Proposal;
  canDecide?: boolean;
}) {
  const [decision, setDecision] = useState(proposal.decision);
  const [milestones, setMilestones] = useState(proposal.milestones);
  const [milestoneId, setMilestoneId] = useState(() => crypto.randomUUID());
  const [label, setLabel] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recorded, setRecorded] = useState(false);
  async function decide(next: Decision) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/api/proposals/${proposal.id}`,
        { decision: next },
        "PATCH",
      );
      setDecision(next);
      setNotice(`Decision saved: ${next}. Other proposals are unchanged.`);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className="panel proposal-card"
      aria-label={`Proposal from ${proposal.team.name}`}
    >
      <div className="spread">
        <div>
          <p className="eyebrow">{proposal.team.name}</p>
          <h3>
            {canDecide ? (
              "A proposal for your project"
            ) : (
              <Link href={`/tasks/${proposal.taskId}`}>
                {proposal.taskTitle}
              </Link>
            )}
          </h3>
        </div>
        <span className={`badge decision-${decision.toLowerCase()}`}>
          {decision}
        </span>
      </div>
      <p className="small muted">
        {proposal.team.skills} · {proposal.team.technologies}
      </p>
      <dl className="proposal-content">
        <dt>Solution idea</dt>
        <dd>{proposal.idea}</dd>
        <dt>Plan</dt>
        <dd>{proposal.plan}</dd>
        <dt>Timeline</dt>
        <dd>{proposal.timeline}</dd>
        <dt>Prototype / demo</dt>
        <dd>
          <a
            className="text-link"
            href={proposal.prototypeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open prototype ↗
          </a>
        </dd>
      </dl>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
        </div>
      )}
      {canDecide && (
        <div className="decision-actions">
          <p className="small muted">
            Choose one, several, or no teams. You can change your decision.
          </p>
          <div className="actions">
            <button
              disabled={busy || decision === "Selected"}
              className="button"
              onClick={() => decide("Selected")}
            >
              Select team
            </button>
            <button
              disabled={busy || decision === "Rejected"}
              className="button secondary"
              onClick={() => decide("Rejected")}
            >
              Reject
            </button>
            {decision !== "Pending" && (
              <button
                disabled={busy}
                className="text-link"
                onClick={() => decide("Pending")}
              >
                Reset to pending
              </button>
            )}
          </div>
        </div>
      )}
      <div className="milestone-summary">
        <strong>
          {milestones.reduce((sum, milestone) => sum + milestone.points, 0)}{" "}
          progress points
        </strong>
        <span>Separate from task readiness</span>
      </div>
      {milestones.length > 0 && (
        <ul className="milestone-list">
          {milestones.map((milestone) => (
            <li key={milestone.id}>
              <strong>
                ✓ {milestone.label} · +{milestone.points}
              </strong>
              <p>{milestone.evidence}</p>
            </li>
          ))}
        </ul>
      )}
      {canDecide && decision === "Selected" && (
        <details className="milestone-form">
          <summary>Confirm a completed milestone</summary>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || recorded) return;
              setBusy(true);
              setError("");
              setNotice("");
              try {
                const { milestone } = await request<{ milestone: Milestone }>(
                  "/api/milestones",
                  { id: milestoneId, proposalId: proposal.id, label, evidence },
                );
                setMilestones((current) =>
                  current.some((m) => m.id === milestone.id)
                    ? current
                    : [...current, milestone],
                );
                setRecorded(true);
                setNotice(
                  "Milestone confirmed. 10 progress points awarded once.",
                );
              } catch (error) {
                setError(message(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset disabled={busy || recorded}>
              <label className="field">
                <span>Milestone label</span>
                <input
                  required
                  minLength={3}
                  maxLength={3000}
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Evidence link or note</span>
                <textarea
                  required
                  minLength={5}
                  maxLength={3000}
                  rows={2}
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                />
              </label>
              <button className="button secondary" type="submit">
                {recorded
                  ? "Milestone recorded"
                  : busy
                    ? "Confirming…"
                    : "Confirm milestone"}
              </button>
            </fieldset>
            {recorded && (
              <button
                type="button"
                className="text-link small"
                onClick={() => {
                  setRecorded(false);
                  setMilestoneId(crypto.randomUUID());
                  setLabel("");
                  setEvidence("");
                }}
              >
                Record another milestone
              </button>
            )}
          </form>
        </details>
      )}
    </article>
  );
}
