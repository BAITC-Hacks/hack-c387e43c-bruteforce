import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  Identity,
  Task,
  Team,
  Proposal,
  Milestone,
  Decision,
  writeTaskSchema,
  proposalInputSchema,
  milestoneInputSchema,
  decisionSchema,
} from "./schemas";
import { scoreCard, supplied } from "./scoring";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
type StoredTask = Omit<Task, "businessName" | "proposalCount">;
type TaskRow = {
  payload: string;
  business_name: string;
  proposal_count: number;
};
type ProposalRow = {
  id: string;
  task_id: string;
  team_id: string;
  request_id: string;
  idea: string;
  plan: string;
  timeline: string;
  prototype_url: string;
  decision: Decision;
  created_at: string;
};
let connection: Database.Database | undefined;

export function databasePath() {
  // This is writable runtime data, never an asset to bundle into the build.
  return resolve(
    /* turbopackIgnore: true */ process.env.SIDEQUEST_DB_PATH ||
      "data/sidequest.sqlite",
  );
}
export function db() {
  if (connection) return connection;
  mkdirSync(dirname(databasePath()), { recursive: true });
  connection = new Database(databasePath());
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  connection.pragma("busy_timeout = 5000");
  connection.exec(`
    CREATE TABLE IF NOT EXISTS businesses (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, interests TEXT NOT NULL, skills TEXT NOT NULL, technologies TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), team_id TEXT NOT NULL REFERENCES teams(id), request_id TEXT NOT NULL,
      idea TEXT NOT NULL, plan TEXT NOT NULL, timeline TEXT NOT NULL, prototype_url TEXT NOT NULL,
      decision TEXT NOT NULL CHECK(decision IN ('Pending','Selected','Rejected')), created_at TEXT NOT NULL,
      UNIQUE(team_id, request_id)
    );
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES proposals(id), label TEXT NOT NULL,
      label_key TEXT NOT NULL, evidence TEXT NOT NULL, confirmed_at TEXT NOT NULL, points INTEGER NOT NULL CHECK(points = 10),
      UNIQUE(proposal_id, label_key)
    );
  `);
  return connection;
}
export function closeDatabase() {
  connection?.close();
  connection = undefined;
}
export function businesses() {
  return db().prepare("SELECT * FROM businesses ORDER BY id").all() as {
    id: string;
    name: string;
    contact: string;
  }[];
}
export function teams() {
  return db().prepare("SELECT * FROM teams ORDER BY id").all() as Team[];
}
export function resolveIdentity(value = "business:b1"): Identity | null {
  const [role, id] = value.split(":");
  const profile =
    role === "business"
      ? businesses().find((p) => p.id === id)
      : role === "team"
        ? teams().find((p) => p.id === id)
        : null;
  return profile
    ? { role: role as Identity["role"], id, name: profile.name }
    : null;
}
const taskQuery =
  "SELECT t.payload, b.name business_name, (SELECT COUNT(*) FROM proposals p WHERE p.task_id=t.id) proposal_count FROM tasks t JOIN businesses b ON b.id=t.business_id";
function taskFromRow(row: TaskRow): Task {
  return {
    ...(JSON.parse(row.payload) as StoredTask),
    businessName: row.business_name,
    proposalCount: row.proposal_count,
  };
}
export function getTask(id: string) {
  const row = db().prepare(`${taskQuery} WHERE t.id=?`).get(id) as
    TaskRow | undefined;
  if (!row) throw new AppError("This task could not be found.", 404);
  return taskFromRow(row);
}
export function allTasks() {
  return (db().prepare(taskQuery).all() as TaskRow[]).map(taskFromRow);
}
export function catalog(topic?: string, tier?: string) {
  return allTasks()
    .filter((task) => task.publishedAt && task.confirmed)
    .map((task) => ({
      id: task.id,
      businessName: task.businessName,
      card: task.confirmed!.card,
      topic: task.confirmed!.topic,
      publishedAt: task.publishedAt!,
      proposalCount: task.proposalCount,
      score: scoreCard(task.confirmed!.card),
    }))
    .sort(
      (a, b) =>
        b.score.total - a.score.total ||
        b.publishedAt.localeCompare(a.publishedAt) ||
        a.id.localeCompare(b.id),
    )
    .filter(
      (task) =>
        (!topic || task.topic === topic) && (!tier || task.score.tier === tier),
    );
}
function requireBusiness(identity: Identity, businessId: string) {
  if (identity.role !== "business" || identity.id !== businessId)
    throw new AppError(
      "Switch to the business that owns this task to make changes.",
      403,
    );
}
function storeTask(task: StoredTask) {
  // Explicit fields prevent derived view data from becoming authoritative storage.
  const {
    id,
    businessId,
    originalDescription,
    working,
    confirmed,
    revision,
    confirmedRevision,
    confirmedAt,
    publishedAt,
    createdAt,
    updatedAt,
  } = task;
  const payload: StoredTask = {
    id,
    businessId,
    originalDescription,
    working,
    confirmed,
    revision,
    confirmedRevision,
    confirmedAt,
    publishedAt,
    createdAt,
    updatedAt,
  };
  db()
    .prepare(
      "INSERT INTO tasks (id,business_id,payload) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
    )
    .run(id, businessId, JSON.stringify(payload));
}

export function writeTask(identity: Identity, body: unknown) {
  const input = writeTaskSchema.parse(body);
  if (identity.role !== "business")
    throw new AppError("Only a business can create or edit a task.", 403);
  return db().transaction(() => {
    const exists = db()
      .prepare("SELECT id FROM tasks WHERE id=?")
      .get(input.id);
    const now = new Date().toISOString();
    const previous: StoredTask | null = exists ? getTask(input.id) : null;
    if (previous) {
      requireBusiness(identity, previous.businessId);
      if (previous.revision !== input.revision)
        throw new AppError(
          "A newer version was saved. Keep your edits, reload the latest version, and review before saving again.",
          409,
        );
      // Original answers form an append-only history.
      if (
        JSON.stringify(
          input.working.answers.slice(0, previous.working.answers.length),
        ) !== JSON.stringify(previous.working.answers)
      )
        throw new AppError(
          "Original answers cannot be replaced. Add a new answer instead.",
          409,
        );
    } else if (input.revision !== 0 || input.action === "publish")
      throw new AppError("Save and confirm this task before publishing.", 409);
    const ids = input.working.answers.map((a) => a.id);
    if (new Set(ids).size !== ids.length)
      throw new AppError("Answer IDs must be unique.");
    const next: StoredTask = previous
      ? {
          ...previous,
          working: input.working,
          revision: previous.revision + 1,
          updatedAt: now,
        }
      : {
          id: input.id,
          businessId: identity.id,
          originalDescription: input.working.description,
          working: input.working,
          confirmed: null,
          revision: 1,
          confirmedRevision: null,
          confirmedAt: null,
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        };
    if (input.action === "confirm") {
      next.confirmed = { card: input.working.card, topic: input.working.topic };
      next.confirmedRevision = next.revision;
      next.confirmedAt = now;
    }
    if (input.action === "publish") {
      if (
        !previous?.confirmed ||
        previous.confirmedRevision !== previous.revision ||
        JSON.stringify(input.working) !== JSON.stringify(previous.working)
      )
        throw new AppError(
          "Confirm your latest details before publishing.",
          409,
        );
      const c = previous.confirmed.card;
      if (!supplied(c.title) || (!supplied(c.context) && !supplied(c.need)))
        throw new AppError(
          "Add a title and a meaningful current situation or need, then confirm again.",
        );
      next.publishedAt = previous.publishedAt ?? now;
      next.confirmedRevision = next.revision;
    }
    storeTask(next);
    return getTask(next.id);
  })();
}

function proposalFromRow(row: ProposalRow): Proposal {
  const task = getTask(row.task_id);
  const milestones = db()
    .prepare(
      "SELECT id, proposal_id proposalId, label, evidence, confirmed_at confirmedAt, points FROM milestones WHERE proposal_id=? ORDER BY confirmed_at",
    )
    .all(row.id) as Milestone[];
  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle:
      task.confirmed?.card.title || task.working.card.title || "Untitled task",
    team: teams().find((t) => t.id === row.team_id)!,
    idea: row.idea,
    plan: row.plan,
    timeline: row.timeline,
    prototypeUrl: row.prototype_url,
    decision: row.decision,
    createdAt: row.created_at,
    milestones,
  };
}
export function getProposal(id: string) {
  const row = db().prepare("SELECT * FROM proposals WHERE id=?").get(id) as
    ProposalRow | undefined;
  if (!row) throw new AppError("This proposal could not be found.", 404);
  return proposalFromRow(row);
}
export function proposalsFor(identity: Identity, taskId?: string) {
  const rows = db()
    .prepare(
      `SELECT p.* FROM proposals p JOIN tasks t ON t.id=p.task_id WHERE ${identity.role === "business" ? "t.business_id" : "p.team_id"}=? ${taskId ? "AND p.task_id=?" : ""} ORDER BY p.created_at DESC, p.id`,
    )
    .all(...(taskId ? [identity.id, taskId] : [identity.id])) as ProposalRow[];
  return rows.map(proposalFromRow);
}
export function submitProposal(identity: Identity, body: unknown) {
  const input = proposalInputSchema.parse(body);
  if (identity.role !== "team")
    throw new AppError("Switch to a student team to submit a proposal.", 403);
  return db().transaction(() => {
    const task = getTask(input.taskId);
    if (!task.publishedAt)
      throw new AppError("Students can apply only to published tasks.", 403);
    const existing = db()
      .prepare("SELECT * FROM proposals WHERE team_id=? AND request_id=?")
      .get(identity.id, input.requestId) as ProposalRow | undefined;
    if (existing) {
      if (
        existing.task_id !== input.taskId ||
        existing.idea !== input.idea ||
        existing.plan !== input.plan ||
        existing.timeline !== input.timeline ||
        existing.prototype_url !== input.prototypeUrl
      )
        throw new AppError(
          "This submission ID was already used for different content. Reload to start a new proposal.",
          409,
        );
      return proposalFromRow(existing);
    }
    const id = randomUUID();
    db()
      .prepare("INSERT INTO proposals VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(
        id,
        input.taskId,
        identity.id,
        input.requestId,
        input.idea,
        input.plan,
        input.timeline,
        input.prototypeUrl,
        "Pending",
        new Date().toISOString(),
      );
    return getProposal(id);
  })();
}
export function decideProposal(
  identity: Identity,
  id: string,
  rawDecision: unknown,
) {
  const decision = decisionSchema.parse(rawDecision);
  return db().transaction(() => {
    const proposal = getProposal(id);
    requireBusiness(identity, getTask(proposal.taskId).businessId);
    db()
      .prepare("UPDATE proposals SET decision=? WHERE id=?")
      .run(decision, id);
    return getProposal(id);
  })();
}
export function confirmMilestone(identity: Identity, body: unknown) {
  const input = milestoneInputSchema.parse(body);
  return db().transaction(() => {
    const proposal = getProposal(input.proposalId);
    requireBusiness(identity, getTask(proposal.taskId).businessId);
    const existing = db()
      .prepare(
        "SELECT id, proposal_id proposalId, label, evidence, confirmed_at confirmedAt, points FROM milestones WHERE id=? OR (proposal_id=? AND label_key=?)",
      )
      .get(input.id, input.proposalId, input.label.toLowerCase()) as
      Milestone | undefined;
    if (existing) {
      if (
        existing.proposalId !== input.proposalId ||
        existing.label !== input.label ||
        existing.evidence !== input.evidence
      )
        throw new AppError(
          "This milestone was already recorded with different details.",
          409,
        );
      return existing;
    }
    if (proposal.decision !== "Selected")
      throw new AppError(
        "Select this proposal before confirming completed work.",
        409,
      );
    const milestone: Milestone = {
      id: input.id,
      proposalId: input.proposalId,
      label: input.label,
      evidence: input.evidence,
      confirmedAt: new Date().toISOString(),
      points: 10,
    };
    db()
      .prepare("INSERT INTO milestones VALUES (?,?,?,?,?,?,?)")
      .run(
        milestone.id,
        milestone.proposalId,
        milestone.label,
        milestone.label.toLowerCase(),
        milestone.evidence,
        milestone.confirmedAt,
        milestone.points,
      );
    return milestone;
  })();
}
