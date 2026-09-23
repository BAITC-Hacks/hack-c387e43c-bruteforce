import { proposalsFor, submitProposal } from "@/lib/db";
import { handle, jsonBody, signedIn } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  return handle(async () => ({ proposals: proposalsFor(await signedIn()) }));
}
export async function POST(request: Request) {
  return handle(async () => ({
    proposal: submitProposal(await signedIn(), await jsonBody(request)),
  }));
}
