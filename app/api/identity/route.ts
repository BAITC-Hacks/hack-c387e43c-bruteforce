import { cookies } from "next/headers";
import { z } from "zod";
import { AppError, resolveIdentity } from "@/lib/db";
import { handle, jsonBody } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => {
    const { identity: value } = z
      .object({ identity: z.string().max(100) })
      .parse(await jsonBody(request));
    const identity = resolveIdentity(value);
    if (!identity) throw new AppError("Choose an available demo identity.");
    (await cookies()).set("sidequest-identity", value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { identity };
  });
}
