import { AppError, getTask } from "@/lib/db";
import { handle, signedIn } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const identity = await signedIn();
    const task = getTask((await context.params).id);
    if (identity.role === "business" && task.businessId === identity.id)
      return { task };
    if (!task.publishedAt) throw new AppError("This task is private.", 404);
    return {
      task: {
        id: task.id,
        confirmed: task.confirmed,
        publishedAt: task.publishedAt,
        businessName: task.businessName,
        proposalCount: task.proposalCount,
      },
    };
  });
}
