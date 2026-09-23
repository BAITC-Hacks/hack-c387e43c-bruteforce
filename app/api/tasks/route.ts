import { catalog, writeTask } from "@/lib/db";
import { handle, jsonBody, signedIn } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(() => {
    const q = new URL(request.url).searchParams;
    return {
      tasks: catalog(q.get("topic") || undefined, q.get("tier") || undefined),
    };
  });
}
export async function POST(request: Request) {
  return handle(async () => ({
    task: writeTask(await signedIn(), await jsonBody(request)),
  }));
}
