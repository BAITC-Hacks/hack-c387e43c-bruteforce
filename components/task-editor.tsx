"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardField,
  Task,
  Working,
  emptyCard,
  topics,
} from "@/lib/schemas";
import { DraftOutput } from "@/lib/ai";
import { cafe35, cafe85, cafeDescription, workingFrom } from "@/lib/fixtures";
import { message, request, RequestError } from "@/lib/client";
import { ScorePanel } from "./score-panel";
import { useNavigationGuard } from "./navigation-guard";

export function TaskEditor({ initial }: { initial?: Task }) {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [record, setRecord] = useState<Task | undefined>(initial);
  const [working, setWorking] = useState<Working>(
    () => initial?.working ?? workingFrom({ ...emptyCard }, ""),
  );
  const [saved, setSaved] = useState(() =>
    JSON.stringify(initial?.working ?? workingFrom({ ...emptyCard }, "")),
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(initial ? 2 : 0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register } = useNavigationGuard();
  const dirty =
    JSON.stringify(working) !== saved || Object.keys(answers).length > 0;
  const confirmed =
    !!record?.confirmed &&
    record.confirmedRevision === record.revision &&
    !dirty;

  const payload = useCallback(
    (): Working => ({
      ...working,
      answers: [
        ...working.answers,
        ...Object.entries(answers).map(([questionId, text]) => ({
          id: crypto.randomUUID(),
          questionId,
          field: working.questions.find(
            (question) => question.id === questionId,
          )!.field,
          text,
        })),
      ],
    }),
    [working, answers],
  );
  const persist = useCallback(
    async (action: "save" | "confirm" | "publish") => {
      if (busy) return false;
      setBusy(action);
      setError("");
      setNotice("");
      setErrors({});
      try {
        const { task } = await request<{ task: Task }>("/api/tasks", {
          id,
          revision: record?.revision ?? 0,
          action,
          working: payload(),
        });
        setRecord(task);
        setWorking(task.working);
        setSaved(JSON.stringify(task.working));
        setAnswers({});
        setNotice(
          action === "save"
            ? "Draft saved. Your public card is unchanged."
            : action === "confirm"
              ? "Details confirmed. Your official score is up to date."
              : "Task published. Every student team can now submit a proposal.",
        );
        if (!record) window.history.replaceState(null, "", `/tasks/${id}/edit`);
        return true;
      } catch (error) {
        setError(message(error));
        if (error instanceof RequestError) setErrors(error.fields);
        return false;
      } finally {
        setBusy("");
      }
    },
    [busy, id, payload, record],
  );

  useEffect(() => {
    register({ dirty, save: () => persist("save") });
    return () => register({ dirty: false, save: async () => true });
  }, [dirty, persist, register]);

  function edit(field: CardField, value: string) {
    setWorking((current) => ({
      ...current,
      card: { ...current.card, [field]: value },
      ownerFields: [...new Set([...current.ownerFields, field])],
      sources: current.sources.filter((source) => source.field !== field),
    }));
    setNotice("");
  }
  function fill(card: Partial<Card>) {
    setWorking((current) => ({
      ...current,
      card: { ...current.card, ...card },
      ownerFields: [
        ...new Set([
          ...current.ownerFields,
          ...(Object.keys(card) as CardField[]),
        ]),
      ],
      sources: current.sources.filter((source) => !(source.field in card)),
    }));
    setNotice(
      "Sample owner answers loaded. Review them, then confirm to update the official score.",
    );
  }
  async function analyze() {
    if (!working.description.trim()) {
      setError("Describe the business problem first.");
      document.getElementById("description")?.focus();
      return;
    }
    setBusy("analyze");
    setError("");
    setNotice("");
    try {
      const next = payload();
      const { result } = await request<{
        result: { questions: Working["questions"] };
      }>("/api/ai", { operation: "analyze", working: next });
      setWorking({ ...next, questions: result.questions });
      setAnswers({});
      setStep(1);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy("");
    }
  }
  async function draft() {
    setBusy("draft");
    setError("");
    setNotice("");
    const next = payload();
    try {
      const { result } = await request<{ result: DraftOutput }>("/api/ai", {
        operation: "draft",
        working: next,
      });
      setWorking({ ...next, card: result.card, sources: result.sources });
      setAnswers({});
      setStep(2);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy("");
    }
  }
  function field(
    key: CardField,
    label: string,
    help?: string,
    multiline = true,
  ) {
    const fieldError = errors[`working.card.${key}`];
    return (
      <label className="field" key={key} htmlFor={`card-${key}`}>
        <span>{label}</span>
        {help && <small>{help}</small>}
        {multiline ? (
          <textarea
            id={`card-${key}`}
            aria-label={label}
            rows={2}
            maxLength={3000}
            value={working.card[key]}
            onChange={(event) => edit(key, event.target.value)}
            aria-invalid={!!fieldError}
          />
        ) : (
          <input
            id={`card-${key}`}
            aria-label={label}
            maxLength={key === "title" ? 120 : key === "contact" ? 254 : 3000}
            value={working.card[key]}
            onChange={(event) => edit(key, event.target.value)}
            aria-invalid={!!fieldError}
          />
        )}
        {fieldError && <small className="field-error">{fieldError}</small>}
      </label>
    );
  }
  return (
    <>
      <Link className="back-link" href="/business">
        ← My tasks
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">From an idea to a shared opportunity</div>
          <h1>{initial ? "Shape your project" : "Start with a challenge"}</h1>
          <p>
            Share what you know. A useful brief can begin with a few honest
            details.
          </p>
        </div>
        <span className={`badge ${dirty ? "tier-workable" : "tier-ready"}`}>
          {dirty
            ? "Unsaved changes"
            : confirmed
              ? "Confirmed"
              : record
                ? "Draft saved"
                : "New draft"}
        </span>
      </div>
      <ol className="steps" aria-label="Task builder steps">
        {["Describe", "Clarify", "Review"].map((label, index) => (
          <li key={label} className={step === index ? "active" : ""}>
            <button
              type="button"
              disabled={!!busy || (index === 1 && !working.questions.length)}
              onClick={() => setStep(index)}
              aria-current={step === index ? "step" : undefined}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      <div className="editor-layout">
        <div>
          <div className="ai-mode">
            <span aria-hidden="true">✧</span>
            <div>
              <strong>Demo AI mode</strong>
              <p>
                Local, topic-aware questions and direct answer mapping. No
                external AI service is connected.
              </p>
            </div>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}{" "}
              <button
                className="text-link"
                onClick={() => {
                  setStep(2);
                  setError("");
                }}
              >
                Continue with manual editing
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
              {record?.publishedAt && (
                <>
                  {" "}
                  <Link href={`/tasks/${id}`}>View published task →</Link>
                </>
              )}
            </div>
          )}
          <fieldset disabled={!!busy} className="editor-fieldset">
            {step === 0 && (
              <section className="panel form-section">
                <div className="spread">
                  <h2>What could be better?</h2>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => {
                      setWorking((current) => ({
                        ...current,
                        description: cafeDescription,
                        topic: "Food & hospitality",
                        card: { ...current.card, title: cafe35.title },
                      }));
                      setNotice(
                        "Fictional café example loaded. You can change any detail.",
                      );
                    }}
                  >
                    Load café example
                  </button>
                </div>
                <p className="muted">
                  You don’t need a perfect brief. Tell us what happens today and
                  what you would like to change.
                </p>
                <label className="field" htmlFor="topic">
                  <span>Project topic</span>
                  <select
                    id="topic"
                    value={working.topic}
                    onChange={(event) =>
                      setWorking({
                        ...working,
                        topic: event.target.value as Working["topic"],
                      })
                    }
                  >
                    {topics.map((topic) => (
                      <option key={topic}>{topic}</option>
                    ))}
                  </select>
                </label>
                <label className="field" htmlFor="description">
                  <span>Describe your challenge</span>
                  <textarea
                    id="description"
                    rows={6}
                    maxLength={3000}
                    placeholder="Our café throws away unsold food. We need help reducing it."
                    value={working.description}
                    onChange={(event) =>
                      setWorking({
                        ...working,
                        description: event.target.value,
                      })
                    }
                  />
                </label>
                <div className="actions end">
                  <button className="button" type="button" onClick={analyze}>
                    {busy === "analyze"
                      ? "Preparing questions…"
                      : "Find the missing details →"}
                  </button>
                </div>
              </section>
            )}
            {step === 1 && (
              <section className="panel form-section">
                <h2>A little more context</h2>
                <p className="muted">
                  Answer what you can. Unknown details stay empty and can be
                  added later.
                </p>
                <blockquote className="original-description">
                  {working.description}
                </blockquote>
                <button
                  className="text-link sample-action"
                  type="button"
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      ...Object.fromEntries(
                        working.questions
                          .filter(
                            (q) =>
                              q.field === "users" || q.field === "deadline",
                          )
                          .map((q) => [q.id, cafe35[q.field]]),
                      ),
                    }))
                  }
                >
                  Load café user & deadline answers
                </button>
                {working.questions.map((question, index) => (
                  <div className="question" key={question.id}>
                    <label className="field" htmlFor={question.id}>
                      <span>
                        {index + 1}. {question.text}
                      </span>
                      <small>{question.reason}</small>
                      <textarea
                        id={question.id}
                        rows={2}
                        maxLength={3000}
                        value={
                          answers[question.id] ??
                          [...working.answers]
                            .reverse()
                            .find((answer) => answer.questionId === question.id)
                            ?.text ??
                          ""
                        }
                        onChange={(event) =>
                          setAnswers({
                            ...answers,
                            [question.id]: event.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      className="text-link small"
                      type="button"
                      onClick={() =>
                        setAnswers({
                          ...answers,
                          [question.id]: "I don't know yet",
                        })
                      }
                    >
                      I don’t know yet
                    </button>
                  </div>
                ))}
                <div className="actions spread">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => setStep(0)}
                  >
                    ← Back
                  </button>
                  <button className="button" type="button" onClick={draft}>
                    {busy === "draft"
                      ? "Organizing your answers…"
                      : "Create editable card →"}
                  </button>
                </div>
              </section>
            )}
            {step === 2 && (
              <>
                <section className="panel form-section">
                  <div className="eyebrow">Your project brief</div>
                  <h2>Make it yours</h2>
                  <p className="muted">
                    Review every detail before confirming. Optional information
                    can stay blank; a low score never blocks proposals.
                  </p>
                  <div className="sample-tools">
                    <span>Prepared demo answers</span>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => fill(cafe35)}
                    >
                      Load 35-point café card
                    </button>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        fill({
                          materialsName: cafe85.materialsName,
                          materialsDescription: cafe85.materialsDescription,
                          materialsAccess: cafe85.materialsAccess,
                          deliverableType: cafe85.deliverableType,
                          deliverableDescription: cafe85.deliverableDescription,
                          successMetric: cafe85.successMetric,
                          successComparison: cafe85.successComparison,
                          successValue: cafe85.successValue,
                          successUnit: cafe85.successUnit,
                          verification: cafe85.verification,
                          successMode: "metric",
                        })
                      }
                    >
                      Add café materials & success details
                    </button>
                  </div>
                  {field(
                    "title",
                    "Project title",
                    "A short, specific name for the work.",
                    false,
                  )}
                  {field("context", "Current situation", "What happens today?")}
                  {field(
                    "need",
                    "Change needed",
                    "What problem should students focus on?",
                  )}
                  {field(
                    "users",
                    "Intended users",
                    "Name the group who will use the result.",
                    false,
                  )}
                </section>
                <section className="panel form-section">
                  <h2>Materials & expected result</h2>
                  <p className="muted">
                    Name what you can share and what you want the team to make.
                  </p>
                  {field(
                    "materialsName",
                    "Material name",
                    "For example: daily item-level sales CSV.",
                    false,
                  )}
                  {field("materialsDescription", "What the material contains")}
                  {field("materialsAccess", "How students can access it")}
                  {field(
                    "deliverableType",
                    "Deliverable type",
                    "For example: browser dashboard, report, or prototype.",
                    false,
                  )}
                  {field(
                    "deliverableDescription",
                    "What the deliverable should do",
                  )}
                </section>
                <section className="panel form-section">
                  <h2>What would success look like?</h2>
                  <label className="field" htmlFor="success-mode">
                    <span>Success criterion type</span>
                    <select
                      id="success-mode"
                      value={working.card.successMode}
                      onChange={(event) =>
                        edit("successMode", event.target.value)
                      }
                    >
                      <option value="metric">Measurable target</option>
                      <option value="check">Observable pass/fail check</option>
                    </select>
                  </label>
                  {working.card.successMode === "metric" ? (
                    <>
                      {field(
                        "successMetric",
                        "Metric",
                        "Name what you will measure.",
                        false,
                      )}
                      <div className="form-row">
                        <label className="field" htmlFor="success-comparison">
                          <span>Comparison</span>
                          <select
                            id="success-comparison"
                            value={working.card.successComparison}
                            onChange={(event) =>
                              edit("successComparison", event.target.value)
                            }
                          >
                            <option value="">Not provided</option>
                            {[
                              "reduce",
                              "increase",
                              "equal",
                              "at least",
                              "at most",
                            ].map((value) => (
                              <option key={value}>{value}</option>
                            ))}
                          </select>
                        </label>
                        {field(
                          "successValue",
                          "Target value",
                          "A number, such as 15.",
                          false,
                        )}
                      </div>
                      {field(
                        "successUnit",
                        "Unit / baseline",
                        "For example: % against a recorded baseline.",
                        false,
                      )}
                    </>
                  ) : (
                    <>
                      {field("successAction", "What will be checked")}
                      {field("successOutcome", "Expected outcome")}
                    </>
                  )}
                  {field(
                    "verification",
                    "How success will be checked",
                    "A planned measurement or test, not an achieved result.",
                  )}
                </section>
                <section className="panel form-section">
                  <h2>Boundaries & staying in touch</h2>
                  {field(
                    "deadline",
                    "Delivery boundary",
                    "A date or a time window.",
                    false,
                  )}
                  {field("boundary", "Technology or access boundary")}
                  {field(
                    "contact",
                    "Contact email",
                    "Optional. A valid email earns 4 points.",
                    false,
                  )}
                  {field("consultation", "Consultation format")}
                  {field("feedback", "Feedback process")}
                </section>
              </>
            )}
            <div className="editor-actions panel">
              <p className="small muted">
                {record?.publishedAt
                  ? "Published · unconfirmed edits remain private"
                  : "Private until you confirm and publish"}
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => persist("save")}
                >
                  {busy === "save" ? "Saving…" : "Save draft"}
                </button>
                {step === 2 && (
                  <>
                    <button
                      type="button"
                      className="button"
                      onClick={() => persist("confirm")}
                    >
                      {busy === "confirm" ? "Confirming…" : "Confirm details"}
                    </button>
                    {!record?.publishedAt && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={!confirmed}
                        onClick={() => persist("publish")}
                      >
                        {busy === "publish" ? "Publishing…" : "Publish task"}
                      </button>
                    )}
                  </>
                )}
              </div>
              {step === 2 && !record?.publishedAt && !confirmed && (
                <p className="fine-print">
                  Confirm the latest details to enable publication.
                </p>
              )}
            </div>
          </fieldset>
        </div>
        <aside>
          <ScorePanel
            card={record?.confirmed?.card ?? null}
            confirmed={!!record?.confirmed}
          />
          {record?.publishedAt && (
            <Link className="button secondary full-width" href={`/tasks/${id}`}>
              View published task ↗
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
