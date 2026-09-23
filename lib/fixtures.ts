import { Card, Working, emptyCard } from "./schemas";

export const cafeDescription =
  "Our café throws away unsold food. We need help reducing it.";
export const cafe35: Card = {
  ...emptyCard,
  title: "Reduce food waste at Sunrise Café",
  context: "Our café throws away unsold food.",
  need: "We need help reducing it.",
  users: "The café manager",
  deadline: "A first working prototype within two weeks",
};
export const cafe85: Card = {
  ...cafe35,
  materialsName: "Daily item-level sales CSV",
  materialsDescription:
    "Daily sales by item. Staff currently do not record discarded food.",
  materialsAccess:
    "The owner will share a de-identified sample CSV at the first consultation.",
  deliverableType: "Browser dashboard",
  deliverableDescription:
    "Import the sales CSV, record discarded items, and show a daily preparation summary.",
  successMetric: "Discarded food by weight",
  successComparison: "reduce",
  successValue: "15",
  successUnit: "% against a recorded baseline",
  verification:
    "After prototype delivery, staff record one baseline week and two pilot weeks, then compare average daily discarded kilograms.",
};
export const cafe100: Card = {
  ...cafe85,
  boundary:
    "Work in a browser using sample data; no production system access is required.",
  contact: "maya@sunrise.example",
  consultation: "Weekly 20-minute video consultation",
  feedback: "Written feedback within two working days",
};
export function workingFrom(
  card: Card,
  description = cafeDescription,
  topic: Working["topic"] = "Food & hospitality",
): Working {
  return {
    description,
    topic,
    card: { ...card },
    questions: [],
    answers: [],
    sources: [],
    ownerFields: [],
  };
}
export const sampleProposals = [
  {
    idea: "Build a simple dashboard that helps the café manager compare sales and discarded food.",
    plan: "Week 1: review the sample CSV and prototype imports. Week 2: add discard recording and a daily preparation summary, then test with the manager.",
    timeline: "A working prototype in two weeks",
    prototypeUrl: "https://example.com/demo/cafe-dashboard",
  },
  {
    idea: "Prototype a lightweight preparation planner with a daily food-waste log.",
    plan: "Interview the café manager, map the CSV columns, design a daily log, and validate the preparation summary using sample records.",
    timeline: "Ten working days with a midpoint review",
    prototypeUrl: "https://example.com/demo/preparation-planner",
  },
];
