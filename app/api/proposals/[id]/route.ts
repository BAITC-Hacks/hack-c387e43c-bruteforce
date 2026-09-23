import { z } from "zod";
import { decideProposal } from "@/lib/db";
import { decisionSchema } from "@/lib/schemas";
import { handle, jsonBody, signedIn } from "@/lib/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const body = z
      .object({ decision: decisionSchema })
      .strict()
      .parse(await jsonBody(request));
    return {
      proposal: decideProposal(
        await signedIn(),
        (await context.params).id,
        body.decision,
      ),
    };
  });
}
