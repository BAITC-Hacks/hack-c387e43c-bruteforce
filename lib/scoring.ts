import { z } from "zod";
import { Card, CardField, emptyCard } from "./schemas";

export const tiers = [
  "Needs clarification",
  "Workable",
  "Ready",
  "Priority",
] as const;
export function tierFor(score: number) {
  return tiers[score < 40 ? 0 : score < 70 ? 1 : score < 90 ? 2 : 3];
}
export function supplied(value: string) {
  const clean = value
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "");
  return (
    clean.length > 0 &&
    !/^(tbd|todo|n\/?a|none|unknown|not provided|i don['’]?t know( yet)?|everyone|we have data|no data( yet)?|make it better|solve our problem|test|placeholder|[.\-?]+)$/.test(
      clean,
    )
  );
}
export type ScoreItem = {
  id: string;
  category: string;
  label: string;
  earned: number;
  maximum: number;
  status: "complete" | "missing";
  reason: string;
  field: CardField;
};
export function scoreCard(input: Card | null) {
  const c = input ?? emptyCard;
  const has = (field: CardField) =>
    supplied(c[field]) &&
    c[field].trim().toLowerCase() !== c.title.trim().toLowerCase();
  const materials = has("materialsName") && has("materialsDescription");
  const target =
    c.successMode === "metric"
      ? has("successMetric") &&
        !!c.successComparison &&
        /^\d+(\.\d+)?$/.test(c.successValue.trim()) &&
        has("successUnit")
      : has("successAction") && has("successOutcome");
  const definitions: [
    string,
    string,
    string,
    number,
    boolean,
    CardField,
    string,
  ][] = [
    [
      "context",
      "Context and need",
      "Current situation",
      10,
      has("context"),
      "context",
      "Describe what happens today.",
    ],
    [
      "need",
      "Context and need",
      "Change needed",
      10,
      has("need"),
      "need",
      "Explain the problem or change you want.",
    ],
    [
      "materials",
      "Data and materials",
      "Available materials",
      10,
      materials,
      "materialsName",
      "Name a dataset, document, or example and describe its contents.",
    ],
    [
      "access",
      "Data and materials",
      "Material access",
      10,
      materials && has("materialsAccess"),
      "materialsAccess",
      "Identify materials first, then explain how the team can access them.",
    ],
    [
      "deliverable",
      "Expected result",
      "Concrete deliverable",
      15,
      has("deliverableType") && has("deliverableDescription"),
      "deliverableType",
      "Specify an artifact type and what it should contain or do.",
    ],
    [
      "target",
      "Success criteria",
      "Success target",
      10,
      target,
      c.successMode === "metric" ? "successMetric" : "successAction",
      "Define a metric, comparison, numeric target and unit, or an observable check and expected outcome.",
    ],
    [
      "verification",
      "Success criteria",
      "Verification method",
      5,
      target && has("verification"),
      "verification",
      "Define a success target first, then describe how to check it.",
    ],
    [
      "deadline",
      "Constraints",
      "Delivery boundary",
      5,
      has("deadline"),
      "deadline",
      "State a deadline or time boundary.",
    ],
    [
      "boundary",
      "Constraints",
      "Technology or access boundary",
      5,
      has("boundary"),
      "boundary",
      "State a technology/access constraint, including explicitly having no restrictions.",
    ],
    [
      "users",
      "Users",
      "Intended users",
      10,
      has("users"),
      "users",
      "Name the specific people who will use the result.",
    ],
    [
      "contact",
      "Business connection",
      "Valid contact email",
      4,
      supplied(c.contact) && z.email().safeParse(c.contact).success,
      "contact",
      "Provide a valid contact email address.",
    ],
    [
      "consultation",
      "Business connection",
      "Consultation format",
      3,
      has("consultation"),
      "consultation",
      "Explain how the team can consult the business.",
    ],
    [
      "feedback",
      "Business connection",
      "Feedback process",
      3,
      has("feedback"),
      "feedback",
      "Describe how the business will provide feedback.",
    ],
  ];
  const items: ScoreItem[] = definitions.map(
    ([id, category, label, maximum, ok, field, missing]) => ({
      id,
      category,
      label,
      maximum,
      earned: ok ? maximum : 0,
      status: ok ? "complete" : "missing",
      field,
      reason: ok ? "Supplied in the confirmed card." : missing,
    }),
  );
  const total = items.reduce((sum, item) => sum + item.earned, 0);
  const categories = [...new Set(items.map((item) => item.category))].map(
    (name) => ({
      name,
      earned: items
        .filter((i) => i.category === name)
        .reduce((s, i) => s + i.earned, 0),
      maximum: items
        .filter((i) => i.category === name)
        .reduce((s, i) => s + i.maximum, 0),
    }),
  );
  return {
    total,
    tier: tierFor(total),
    items,
    categories,
    missing: items.filter((i) => !i.earned),
  };
}
