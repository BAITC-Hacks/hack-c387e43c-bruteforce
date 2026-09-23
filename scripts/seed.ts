import { seed } from "../lib/seed";
import { closeDatabase, databasePath } from "../lib/db";
try {
  const reset = process.argv.includes("--reset");
  if (reset)
    console.log("Explicit reset: replacing ALL records in", databasePath());
  console.log("Seeded", databasePath(), seed(reset));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  closeDatabase();
}
