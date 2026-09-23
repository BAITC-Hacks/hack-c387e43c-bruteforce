import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  catalog,
  closeDatabase,
  confirmMilestone,
  decideProposal,
  getProposal,
  getTask,
  proposalsFor,
  resolveIdentity,
  submitProposal,
  writeTask,
} from "../lib/db";
import { seed } from "../lib/seed";
import { cafe35, cafe85, workingFrom, sampleProposals } from "../lib/fixtures";
import { emptyCard } from "../lib/schemas";
const directory = mkdtempSync(join(tmpdir(), "sidequest-test-"));
process.env.SIDEQUEST_DB_PATH = join(directory, "test.sqlite");
beforeEach(() => seed(true));
after(() => {
  closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
const business = () => resolveIdentity("business:b1")!;
const team = (id = "t1") => resolveIdentity(`team:${id}`)!;
function published() {
  const saved = writeTask(business(), {
    id: randomUUID(),
    revision: 0,
    action: "confirm",
    working: workingFrom(cafe35),
  });
  return writeTask(business(), {
    id: saved.id,
    revision: saved.revision,
    action: "publish",
    working: saved.working,
  });
}
test("seeds have real expected scores and catalog filters compose", () => {
  assert.deepEqual(
    catalog().map((task) => task.score.total),
    [90, 80, 65, 45, 25],
  );
  assert.equal(catalog("Food & hospitality", "Needs clarification").length, 1);
  assert.equal(catalog("Food & hospitality", "Priority").length, 0);
  assert.throws(() => seed(), /already contains/);
  assert.equal(catalog().length, 5);
});
test("low-score publication, isolated draft edits, confirmation and rank changes", () => {
  let task = published();
  assert.equal(catalog().findIndex((t) => t.id === task.id) + 1, 5);
  const proposal = submitProposal(team(), {
    ...sampleProposals[0],
    taskId: task.id,
    requestId: randomUUID(),
  });
  task = writeTask(business(), {
    id: task.id,
    revision: task.revision,
    action: "save",
    working: workingFrom(cafe85),
  });
  assert.equal(catalog().find((t) => t.id === task.id)!.score.total, 35);
  assert.equal(catalog().find((t) => t.id === task.id)!.card.materialsName, "");
  assert.throws(
    () =>
      writeTask(business(), {
        id: task.id,
        revision: task.revision,
        action: "publish",
        working: task.working,
      }),
    /Confirm your latest/,
  );
  task = writeTask(business(), {
    id: task.id,
    revision: task.revision,
    action: "confirm",
    working: task.working,
  });
  assert.equal(catalog().find((t) => t.id === task.id)!.score.total, 85);
  assert.equal(catalog().findIndex((t) => t.id === task.id) + 1, 2);
  assert.equal(getProposal(proposal.id).taskId, task.id);
  writeTask(business(), {
    id: task.id,
    revision: task.revision,
    action: "confirm",
    working: workingFrom(cafe35),
  });
  assert.equal(catalog().findIndex((t) => t.id === task.id) + 1, 5);
});
test("ownership checks, unpublished access and stale edits cannot mutate records", () => {
  const task = writeTask(business(), {
    id: randomUUID(),
    revision: 0,
    action: "save",
    working: workingFrom(cafe35),
  });
  assert.throws(
    () =>
      writeTask(team(), {
        id: task.id,
        revision: task.revision,
        action: "save",
        working: task.working,
      }),
    /Only a business/,
  );
  assert.throws(
    () =>
      writeTask(resolveIdentity("business:b2")!, {
        id: task.id,
        revision: task.revision,
        action: "confirm",
        working: task.working,
      }),
    /owns this task/,
  );
  assert.throws(
    () =>
      writeTask(business(), {
        id: task.id,
        revision: 0,
        action: "save",
        working: task.working,
      }),
    /newer version/,
  );
  assert.throws(
    () =>
      submitProposal(team(), {
        ...sampleProposals[0],
        taskId: task.id,
        requestId: randomUUID(),
      }),
    /published tasks/,
  );
  const blank = writeTask(business(), {
    id: randomUUID(),
    revision: 0,
    action: "confirm",
    working: workingFrom(emptyCard, ""),
  });
  assert.throws(
    () =>
      writeTask(business(), {
        id: blank.id,
        revision: blank.revision,
        action: "publish",
        working: blank.working,
      }),
    /meaningful/,
  );
});
test("proposals remain unlimited, independent and safe to retry", () => {
  const task = published();
  const input = {
    ...sampleProposals[0],
    taskId: task.id,
    requestId: randomUUID(),
  };
  const first = submitProposal(team(), input);
  assert.equal(submitProposal(team(), input).id, first.id);
  assert.throws(
    () =>
      submitProposal(team(), {
        ...input,
        idea: "A changed idea for a different attempt",
      }),
    /different content/,
  );
  const second = submitProposal(team("t2"), {
    ...sampleProposals[1],
    taskId: task.id,
    requestId: randomUUID(),
  });
  decideProposal(business(), first.id, "Selected");
  decideProposal(business(), second.id, "Selected");
  decideProposal(business(), first.id, "Rejected");
  assert.equal(getProposal(second.id).decision, "Selected");
  decideProposal(business(), first.id, "Pending");
  assert.equal(getProposal(first.id).decision, "Pending");
  assert.throws(
    () => decideProposal(team(), first.id, "Selected"),
    /owns this task/,
  );
  submitProposal(team(), { ...input, requestId: randomUUID() });
  assert.equal(proposalsFor(business(), task.id).length, 3);
});
test("milestone points are awarded once and survive decision changes and reconnects", () => {
  const task = published();
  const proposal = submitProposal(team(), {
    ...sampleProposals[0],
    taskId: task.id,
    requestId: randomUUID(),
  });
  const milestone = {
    id: randomUUID(),
    proposalId: proposal.id,
    label: "First prototype",
    evidence: "Reviewed the working import with the café manager.",
  };
  assert.throws(
    () => confirmMilestone(business(), milestone),
    /Select this proposal/,
  );
  decideProposal(business(), proposal.id, "Selected");
  const first = confirmMilestone(business(), milestone);
  assert.equal(confirmMilestone(business(), milestone).id, first.id);
  assert.equal(
    confirmMilestone(business(), { ...milestone, id: randomUUID() }).id,
    first.id,
  );
  decideProposal(business(), proposal.id, "Rejected");
  closeDatabase();
  assert.equal(getProposal(proposal.id).decision, "Rejected");
  assert.equal(
    getProposal(proposal.id).milestones.reduce((sum, m) => sum + m.points, 0),
    10,
  );
  assert.equal(getTask(task.id).confirmed?.card.title, cafe35.title);
  assert.equal(catalog().find((t) => t.id === task.id)!.score.total, 35);
});
