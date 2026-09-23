import { cookies } from "next/headers";
import { resolveIdentity } from "./db";

export async function currentIdentity() {
  return resolveIdentity((await cookies()).get("sidequest-identity")?.value);
}
