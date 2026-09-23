import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCard, tierFor } from "../lib/scoring";
import { emptyCard } from "../lib/schemas";
import { cafe35, cafe85, cafe100 } from "../lib/fixtures";

test("confirmed café stages have the specified deterministic totals and breakdown", () => {
  assert.equal(scoreCard(null).total, 0);
  assert.equal(scoreCard(emptyCard).total, 0);
  assert.equal(scoreCard(cafe35).total, 35);
  assert.equal(scoreCard(cafe85).total, 85);
  assert.equal(scoreCard(cafe100).total, 100);
  assert.deepEqual(scoreCard(cafe85), scoreCard(cafe85));
  assert.deepEqual(
    scoreCard(cafe85).categories.map((c) => c.earned),
    [20, 20, 15, 15, 5, 10, 0],
  );
  assert.equal(scoreCard({ ...cafe85, materialsName: "" }).total, 65);
});
test("dependent points require materials and a structured success target", () => {
  assert.equal(
    scoreCard({
      ...emptyCard,
      materialsAccess: "Share a CSV at the meeting",
      verification: "Review it together",
    }).total,
    0,
  );
  assert.equal(
    scoreCard({ ...emptyCard, successMetric: "Waste", successValue: "15" })
      .total,
    0,
  );
  assert.equal(
    scoreCard({
      ...emptyCard,
      successMode: "check",
      successAction: "Submit a booking",
      successOutcome: "One booking appears in the calendar",
      verification: "Run three sample bookings",
    }).total,
    15,
  );
});
test("placeholders, copied titles, malformed contacts, and empty input earn no points", () => {
  for (const placeholder of [
    "   ",
    "TBD",
    "I don't know yet",
    "Not provided",
    "Everyone",
    "We have data",
  ]) {
    assert.equal(
      scoreCard({
        ...emptyCard,
        context: placeholder,
        need: placeholder,
        users: placeholder,
      }).total,
      0,
    );
  }
  assert.equal(
    scoreCard({
      ...emptyCard,
      title: "Our project",
      context: "Our project",
      need: "Our project",
      contact: "invalid",
    }).total,
    0,
  );
  assert.equal(
    scoreCard({ ...emptyCard, contact: "maya@sunrise.example" }).total,
    4,
  );
});
test("tiers change exactly at the defined boundaries", () => {
  assert.deepEqual([0, 39, 40, 69, 70, 89, 90, 100].map(tierFor), [
    "Needs clarification",
    "Needs clarification",
    "Workable",
    "Workable",
    "Ready",
    "Ready",
    "Priority",
    "Priority",
  ]);
});
