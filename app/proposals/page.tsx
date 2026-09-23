import Link from "next/link";
import { proposalsFor } from "@/lib/db";
import { currentIdentity } from "@/lib/demo-identity";
import { ProposalCard } from "@/components/proposal-card";
export default async function MyProposals() {
  const identity = await currentIdentity();
  if (identity?.role !== "team")
    return (
      <section className="panel empty">
        <h1>A space for your team</h1>
        <p>
          Choose a student team in the demo identity selector to see its
          proposals.
        </p>
      </section>
    );
  const proposals = proposalsFor(identity);
  const points = proposals
    .flatMap((proposal) => proposal.milestones)
    .reduce((sum, milestone) => sum + milestone.points, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{identity.name} · Student workspace</div>
          <h1>Your ideas, in motion.</h1>
          <p>Follow your proposals and the progress you have made together.</p>
        </div>
        <div className="points-card">
          <strong>{points}</strong>
          <span>Team progress points</span>
        </div>
      </div>
      <div className="section-heading">
        <h2>
          My proposals <span className="muted">({proposals.length})</span>
        </h2>
        <Link className="text-link" href="/">
          Explore more projects ↗
        </Link>
      </div>
      {proposals.length ? (
        <div className="proposal-grid">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      ) : (
        <section className="panel empty">
          <h2>Your next project is out there</h2>
          <p>Browse any published task and share your team’s approach.</p>
          <Link className="button" href="/">
            Explore projects
          </Link>
        </section>
      )}
    </>
  );
}
