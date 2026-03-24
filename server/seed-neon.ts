import { getDb } from "./db";
import {
  chapters,
  commands,
  exams,
  examQuestions,
  labs,
} from "../drizzle/schema";
import {
  FALLBACK_CHAPTERS,
  FALLBACK_COMMANDS,
  FALLBACK_EXAMS,
  FALLBACK_EXAM_QUESTIONS,
  FALLBACK_LABS,
} from "./data";
import * as dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection!");
    return;
  }

  console.log("Seeding Neon DB...");

  // Truncate tables correctly ignoring cases (pgTable defaults to correct casing quoting usually)
  await db.execute(sql`TRUNCATE TABLE "chapters" RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE "commands" RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE "exams" RESTART IDENTITY CASCADE`);
  await db.execute(
    sql`TRUNCATE TABLE "examQuestions" RESTART IDENTITY CASCADE`
  );
  await db.execute(sql`TRUNCATE TABLE "labs" RESTART IDENTITY CASCADE`);

  console.log("Inserting chapters...");
  for (let c of FALLBACK_CHAPTERS) {
    await db.insert(chapters).values(c as any);
  }

  console.log("Inserting commands...");
  for (let i = 0; i < FALLBACK_COMMANDS.length; i += 10) {
    await db.insert(commands).values(FALLBACK_COMMANDS.slice(i, i + 10) as any);
  }

  console.log("Inserting exams...");
  for (let c of FALLBACK_EXAMS) {
    await db
      .insert(exams)
      .values({ ...c, passingScore: c.passingScore.toString() });
  }

  console.log("Inserting exam questions...");
  for (let c of FALLBACK_EXAM_QUESTIONS) {
    await db.insert(examQuestions).values(c as any);
  }

  console.log("Inserting labs...");
  for (let c of FALLBACK_LABS) {
    await db.insert(labs).values(c as any);
  }

  console.log("Done seeding.");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
