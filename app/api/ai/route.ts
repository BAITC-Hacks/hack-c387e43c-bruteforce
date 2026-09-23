import { z } from "zod";
import { analyze, generateDraft } from "@/lib/ai";
import { workingSchema } from "@/lib/schemas";
import { AppError } from "@/lib/db";
import { handle, jsonBody, signedIn } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => {
    if ((await signedIn()).role !== "business")
      throw new AppError("Only a business can draft a task.", 403);
    const { operation, working } = z
      .object({
        operation: z.enum(["analyze", "draft"]),
        working: workingSchema,
      })
      .strict()
      .parse(await jsonBody(request));
    return {
      mode: "demo",
      result:
        operation === "analyze" ? analyze(working) : generateDraft(working),
    };
  });
}
