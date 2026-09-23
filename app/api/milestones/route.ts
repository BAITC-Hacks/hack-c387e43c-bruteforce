import { confirmMilestone } from "@/lib/db";
import { handle, jsonBody, signedIn } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => ({
    milestone: confirmMilestone(await signedIn(), await jsonBody(request)),
  }));
}
