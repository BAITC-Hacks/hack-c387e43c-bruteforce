"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Team } from "@/lib/schemas";
import { sampleProposals } from "@/lib/fixtures";
import { message, request, RequestError } from "@/lib/client";
export function ProposalForm({ taskId, team }: { taskId: string; team: Team }) {
  const router = useRouter();
  const [requestId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState({
    idea: "",
    plan: "",
    timeline: "",
    prototypeUrl: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (sent)
    return (
      <div className="panel success-panel" role="status">
        <span className="success-icon" aria-hidden="true">
          ✓
        </span>
        <h2>Your proposal is in</h2>
        <p>
          The business will review it and make the decision. You can follow its
          status in your workspace.
        </p>
        <Link className="button" href="/proposals">
          Go to My proposals →
        </Link>
      </div>
    );
  return (
    <section id="proposal" className="panel form-section">
      <div className="eyebrow">Your team. Your approach.</div>
      <h2>Submit a proposal</h2>
      <p className="muted">
        Any team can apply at any readiness level. Tell the business what you
        would build and how.
      </p>
      <div className="team-summary">
        <strong>{team.name}</strong>
        <span>{team.skills}</span>
        <small>{team.technologies}</small>
        <small>Interests: {team.interests}</small>
      </div>
      <form
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          setErrors({});
          try {
            await request("/api/proposals", { requestId, taskId, ...values });
            setSent(true);
            router.refresh();
          } catch (error) {
            setError(message(error));
            if (error instanceof RequestError) {
              setErrors(error.fields);
              const field = Object.keys(error.fields)[0];
              setTimeout(
                () => document.getElementById(`proposal-${field}`)?.focus(),
                0,
              );
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <div className="sample-tools">
            <span>Demo preparation</span>
            <button
              type="button"
              className="text-link"
              onClick={() =>
                setValues({ ...sampleProposals[team.id === "t2" ? 1 : 0] })
              }
            >
              Load sample proposal
            </button>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {(
            [
              ["idea", "Solution idea"],
              ["plan", "Your plan"],
              ["timeline", "Timeline"],
              ["prototypeUrl", "Prototype / demo URL"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key} htmlFor={`proposal-${key}`}>
              <span>{label}</span>
              {key === "idea" || key === "plan" ? (
                <textarea
                  rows={3}
                    id={`proposal-${key}`}
                    aria-label={label}
                  value={values[key]}
                  maxLength={3000}
                  aria-invalid={!!errors[key]}
                  onChange={(event) =>
                    setValues({ ...values, [key]: event.target.value })
                  }
                />
              ) : (
                <input
                    id={`proposal-${key}`}
                    aria-label={label}
                  value={values[key]}
                  maxLength={key === "prototypeUrl" ? 2000 : 3000}
                  type={key === "prototypeUrl" ? "url" : "text"}
                  placeholder={key === "prototypeUrl" ? "https://…" : undefined}
                  aria-invalid={!!errors[key]}
                  onChange={(event) =>
                    setValues({ ...values, [key]: event.target.value })
                  }
                />
              )}
              {errors[key] && (
                <small className="field-error">{errors[key]}</small>
              )}
            </label>
          ))}
          <button className="button" type="submit">
            {busy ? "Submitting…" : "Submit proposal"}
          </button>
          <p className="fine-print">
            Your submission is visible to the business. Prototype links in the
            demo fixtures are examples.
          </p>
        </fieldset>
      </form>
    </section>
  );
}
