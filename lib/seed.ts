import { randomUUID } from "node:crypto";
import { db, resolveIdentity, writeTask, submitProposal } from "./db";
import { Card, emptyCard, topics } from "./schemas";
import { cafe100, sampleProposals, workingFrom } from "./fixtures";
import { scoreCard } from "./scoring";

export function seed(reset = false) {
  const database = db();
  const count = (
    database.prepare("SELECT COUNT(*) count FROM businesses").get() as {
      count: number;
    }
  ).count;
  if (count && !reset)
    throw new Error(
      "The demo database already contains records. Startup never resets it. To replace ALL demo data, explicitly run npm run seed:reset.",
    );
  return database.transaction(() => {
    if (reset)
      database.exec(
        "DELETE FROM milestones; DELETE FROM proposals; DELETE FROM tasks; DELETE FROM teams; DELETE FROM businesses;",
      );
    const business = database.prepare("INSERT INTO businesses VALUES (?,?,?)");
    business.run("b1", "Sunrise Café", "maya@sunrise.example");
    business.run(
      "b2",
      "Neighbourhood Collective",
      "hello@neighbourhood.example",
    );
    const insertTeam = database.prepare("INSERT INTO teams VALUES (?,?,?,?,?)");
    [
      [
        "t1",
        "Pixel Pioneers",
        "Sustainability and useful interfaces",
        "Product design, frontend development",
        "React, TypeScript, Figma",
      ],
      [
        "t2",
        "Data Sprouts",
        "Food systems and data storytelling",
        "Data analysis, dashboards",
        "Python, SQL, React",
      ],
      [
        "t3",
        "Open Circuit",
        "Local retail and operations",
        "Backend development, integrations",
        "Node.js, SQLite",
      ],
      [
        "t4",
        "Learning Loop",
        "Education and accessibility",
        "User research, prototyping",
        "TypeScript, HTML, CSS",
      ],
      [
        "t5",
        "Route Five",
        "Logistics and community projects",
        "Process mapping, full-stack development",
        "React, Node.js, Python",
      ],
    ].forEach((row) => insertTeam.run(...row));
    const descriptions = [
      [
        "Understand daily café food waste",
        "Our café discards unsold pastries each evening.",
        "We need a clearer picture of which products are wasted.",
      ],
      [
        "Make shop inventory easier to track",
        "Our neighbourhood shop tracks stock in a paper notebook.",
        "We need to spot items that are running low.",
      ],
      [
        "Simplify tutoring bookings",
        "Our tutoring centre receives booking requests by phone.",
        "We need a single view of lesson requests and available slots.",
      ],
      [
        "Plan more reliable local deliveries",
        "Our delivery desk assigns routes on a whiteboard.",
        "We need a clearer daily route plan for drivers.",
      ],
      [
        "Turn customer feedback into useful themes",
        "Our community desk receives feedback in a spreadsheet.",
        "We need to identify recurring service problems.",
      ],
    ];
    const totals = [25, 45, 65, 80, 90];
    const cards: Card[] = descriptions.map(([title, context, need], index) => {
      const base = {
        ...emptyCard,
        title,
        context,
        need,
        deadline: "First prototype within two weeks",
      };
      if (index === 0) return base;
      if (index === 1)
        return {
          ...base,
          users: "Shop assistants",
          contact: "hello@neighbourhood.example",
          consultation: "A weekly video call",
          feedback: "Written feedback after each review",
        };
      if (index === 2)
        return {
          ...base,
          users: "Tutoring coordinators",
          deliverableType: "Booking prototype",
          deliverableDescription: "A form and calendar for lesson requests",
          successMode: "check",
          successAction: "Submit a sample lesson request",
          successOutcome:
            "The request appears exactly once in the coordinator calendar",
          verification:
            "Run the sample booking flow together with a coordinator",
        };
      if (index === 3)
        return {
          ...base,
          users: "Delivery dispatchers",
          materialsName: "Sample delivery spreadsheet",
          materialsDescription: "Stops and delivery windows for a sample day",
          materialsAccess:
            "A de-identified spreadsheet shared at the first call",
          deliverableType: "Route planning prototype",
          deliverableDescription:
            "Show a daily ordered stop list for each driver",
          successMode: "check",
          successAction: "Load the supplied sample stops",
          successOutcome: "Every sample stop appears once in a driver route",
        };
      return {
        ...cafe100,
        title,
        context,
        need,
        users: "",
        materialsName: "Customer feedback spreadsheet",
        materialsDescription:
          "De-identified feedback text and submission dates",
        materialsAccess: "Shared as a CSV at the first consultation",
        deliverableType: "Feedback summary dashboard",
        deliverableDescription: "Group feedback into owner-reviewed themes",
        successMode: "check",
        successAction: "Open a theme from the dashboard",
        successOutcome: "The theme links to its original feedback records",
        verification:
          "Compare five theme summaries with their underlying records",
        contact: "hello@neighbourhood.example",
      };
    });
    const ids = cards.map((card, index) => {
      const score = scoreCard(card).total;
      if (score !== totals[index])
        throw new Error(
          `Seed ${index + 1} scores ${score}, expected ${totals[index]}`,
        );
      const id = randomUUID();
      const owner = resolveIdentity(
        index === 0 ? "business:b1" : "business:b2",
      )!;
      const working = workingFrom(
        card,
        `${card.context} ${card.need}`,
        topics[index],
      );
      const saved = writeTask(owner, {
        id,
        revision: 0,
        action: "confirm",
        working,
      });
      writeTask(owner, {
        id,
        revision: saved.revision,
        action: "publish",
        working,
      });
      return id;
    });
    for (let i = 0; i < 5; i++)
      submitProposal(resolveIdentity(`team:t${i + 1}`)!, {
        requestId: randomUUID(),
        taskId: ids[i < 2 ? 0 : i - 1],
        ...(i < 2
          ? sampleProposals[i]
          : {
              idea: "Build a small prototype around the task's stated need and available materials.",
              plan: "Review the brief with the business, prototype the main workflow, and demonstrate the result for feedback.",
              timeline: "Two weeks with a midpoint review",
              prototypeUrl: "https://example.com/demo/student-prototype",
            }),
      });
    return { tasks: cards.length, teams: 5, proposals: 5, scores: totals };
  })();
}
