import { z } from "zod";

export const topics = [
  "Food & hospitality",
  "Retail",
  "Education",
  "Logistics",
  "Customer experience",
  "Other",
] as const;
export const topicSchema = z.enum(topics);
const text = z.string().trim().max(3000, "Use 3,000 characters or fewer.");
export const cardSchema = z
  .object({
    title: text.max(120),
    context: text,
    need: text,
    users: text,
    materialsName: text,
    materialsDescription: text,
    materialsAccess: text,
    deliverableType: text,
    deliverableDescription: text,
    successMode: z.enum(["metric", "check"]),
    successMetric: text,
    successComparison: z.enum([
      "",
      "reduce",
      "increase",
      "equal",
      "at least",
      "at most",
    ]),
    successValue: text.max(80),
    successUnit: text.max(80),
    successAction: text,
    successOutcome: text,
    verification: text,
    deadline: text,
    boundary: text,
    contact: text.max(254),
    consultation: text,
    feedback: text,
  })
  .strict();
export type Card = z.infer<typeof cardSchema>;
export type CardField = keyof Card;
export const cardFieldSchema = cardSchema.keyof();
export const emptyCard: Card = {
  title: "",
  context: "",
  need: "",
  users: "",
  materialsName: "",
  materialsDescription: "",
  materialsAccess: "",
  deliverableType: "",
  deliverableDescription: "",
  successMode: "metric",
  successMetric: "",
  successComparison: "",
  successValue: "",
  successUnit: "",
  successAction: "",
  successOutcome: "",
  verification: "",
  deadline: "",
  boundary: "",
  contact: "",
  consultation: "",
  feedback: "",
};
export const questionSchema = z
  .object({
    id: z.string().min(1).max(100),
    field: cardFieldSchema,
    text: text.min(1),
    reason: text.min(1),
  })
  .strict();
export const answerSchema = z
  .object({
    id: z.string().min(1).max(100),
    questionId: z.string().max(100),
    field: cardFieldSchema,
    text,
  })
  .strict();
export type Question = z.infer<typeof questionSchema>;
export type Answer = z.infer<typeof answerSchema>;
export const sourceSchema = z
  .object({
    field: cardFieldSchema,
    sourceId: z.string().min(1).max(100),
    quote: text,
  })
  .strict();
export const workingSchema = z
  .object({
    description: text,
    topic: topicSchema,
    card: cardSchema,
    questions: z.array(questionSchema).max(20),
    answers: z.array(answerSchema).max(200),
    sources: z.array(sourceSchema).max(100),
    ownerFields: z.array(cardFieldSchema).max(30),
  })
  .strict();
export type Working = z.infer<typeof workingSchema>;
export const writeTaskSchema = z
  .object({
    id: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    action: z.enum(["save", "confirm", "publish"]),
    working: workingSchema,
  })
  .strict();
export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  interests: z.string(),
  skills: z.string(),
  technologies: z.string(),
});
export type Team = z.infer<typeof teamSchema>;
export const decisionSchema = z.enum(["Pending", "Selected", "Rejected"]);
export type Decision = z.infer<typeof decisionSchema>;
export const httpUrl = z
  .string()
  .trim()
  .url("Enter a complete http:// or https:// URL.")
  .max(2000)
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "Use an http:// or https:// URL.",
  );
export const proposalInputSchema = z
  .object({
    requestId: z.string().uuid(),
    taskId: z.string().min(1),
    idea: text.min(10, "Describe your solution idea (at least 10 characters)."),
    plan: text.min(10, "Describe your plan (at least 10 characters)."),
    timeline: text.min(3, "Provide a timeline."),
    prototypeUrl: httpUrl,
  })
  .strict();
export const milestoneInputSchema = z
  .object({
    id: z.string().uuid(),
    proposalId: z.string(),
    label: text.min(3, "Name the completed milestone."),
    evidence: text.min(5, "Add an evidence link or a short note."),
  })
  .strict();
export type Identity = { role: "business" | "team"; id: string; name: string };
export type Task = {
  id: string;
  businessId: string;
  businessName: string;
  originalDescription: string;
  working: Working;
  confirmed: { card: Card; topic: (typeof topics)[number] } | null;
  revision: number;
  confirmedRevision: number | null;
  confirmedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  proposalCount: number;
};
export type Milestone = {
  id: string;
  proposalId: string;
  label: string;
  evidence: string;
  confirmedAt: string;
  points: number;
};
export type Proposal = {
  id: string;
  taskId: string;
  taskTitle: string;
  team: Team;
  idea: string;
  plan: string;
  timeline: string;
  prototypeUrl: string;
  decision: Decision;
  createdAt: string;
  milestones: Milestone[];
};
