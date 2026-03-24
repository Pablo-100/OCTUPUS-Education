import "dotenv/config";
import { getDb } from "./server/db.ts";
import { labs, exams } from "./drizzle/schema.ts";
import { count } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("no db");
    return;
  }
  const l = await db.select().from(labs);
  console.log("Labs:", l.length);
  const importedLabs = l.filter(x => x.titleEn.includes("[Import"));
  console.log("Imported Labs:", importedLabs.length);
  if (importedLabs.length > 0) {
    console.log(
      importedLabs[0].titleEn,
      importedLabs[0].instructionsEn?.slice(0, 50)
    );
  }

  const e = await db.select().from(exams);
  console.log("Exams:", e.length);
  const importedExams = e.filter(x => x.titleEn.includes("[Import"));
  console.log("Imported Exams:", importedExams.length);
  process.exit(0);
}
run();
