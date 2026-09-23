import { Card } from "@/lib/schemas";
import { scoreCard, tierFor } from "@/lib/scoring";
export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`badge tier-${score < 40 ? "draft" : score < 70 ? "workable" : score < 90 ? "ready" : "priority"}`}
    >
      {tierFor(score)}
    </span>
  );
}
export function ScorePanel({
  card,
  confirmed = true,
}: {
  card: Card | null;
  confirmed?: boolean;
}) {
  const score = scoreCard(card);
  return (
    <section className="panel score-panel" aria-label="Readiness breakdown">
      <div className="eyebrow">
        {confirmed ? "Confirmed readiness" : "Not confirmed yet"}
      </div>
      <div className="score-total">
        <strong>{score.total}</strong>
        <span>/ 100</span>
      </div>
      <ScoreBadge score={score.total} />
      <p className="muted small">
        {confirmed
          ? "Based on the last confirmed details. Saved edits do not change this score."
          : "Confirm your details to earn official readiness points."}
      </p>
      <div className="score-categories">
        {score.categories.map((category) => (
          <div key={category.name}>
            <div className="spread small">
              <span>{category.name}</span>
              <strong>
                {category.earned}
                <span className="muted"> / {category.maximum}</span>
              </strong>
            </div>
            <progress
              max={category.maximum}
              value={category.earned}
              aria-label={category.name}
            />
          </div>
        ))}
      </div>
      <details className="gaps" open>
        <summary>
          {score.missing.length
            ? `${score.missing.length} details to improve`
            : "All readiness details supplied"}
        </summary>
        <ul>
          {score.missing.map((item) => (
            <li key={item.id}>
              <strong>
                {item.label} · +{item.maximum}
              </strong>
              <span>{item.reason}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="fine-print">
        Readiness measures confirmed completeness, not independently verified
        business outcomes.
      </p>
    </section>
  );
}
