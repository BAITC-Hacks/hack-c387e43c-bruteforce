import { ZodError } from "zod";
import { AppError } from "./db";
import { currentIdentity } from "./demo-identity";

export async function signedIn() {
  const identity = await currentIdentity();
  if (!identity)
    throw new AppError(
      "Choose a demo identity. If none are available, run npm run seed first.",
      401,
    );
  return identity;
}
export async function jsonBody(request: Request) {
  const origin = request.headers.get("origin");
  // Next may construct request.url with its internal hostname. Compare the
  // browser origin to the actual incoming Host header for this local server.
  if (
    origin &&
    new URL(origin).host !==
      (request.headers.get("host") || new URL(request.url).host)
  )
    throw new AppError("Please submit from this application.", 403);
  const body = await request.text();
  if (body.length > 150_000)
    throw new AppError("This request is too large.", 413);
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError("The request is not valid JSON.");
  }
}
export async function handle(operation: () => unknown | Promise<unknown>) {
  try {
    return Response.json(await operation(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          error: "Check the highlighted fields and try again.",
          fields: Object.fromEntries(
            error.issues.map((issue) => [issue.path.join("."), issue.message]),
          ),
        },
        { status: 400 },
      );
    if (error instanceof AppError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error(error);
    return Response.json(
      {
        error:
          "We could not complete that request. Your input is still here; please try again.",
      },
      { status: 500 },
    );
  }
}
