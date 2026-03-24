import { getDb } from "./server/db.js";
import { labs, exams } from "./drizzle/schema.js";
import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
// Assume dotenv is already loaded

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("No DB available");
    return;
  }

  const rawData = fs.readFileSync(
    path.join(__dirname, "labs & WT", "extracted_content.json"),
    "utf8"
  );
  const data = JSON.parse(rawData);

  let nextLabId = 100;
  let nextExamId = 100;

  for (const key in data) {
    const text = data[key];
    const isExam =
      key.toLowerCase().includes("wt") ||
      key.toLowerCase().includes("exam") ||
      key.toLowerCase().includes("test");

    if (isExam) {
      await db
        .insert(exams)
        .values({
          id: nextExamId++,
          titleEn: `[Imported] ${key}`,
          titleFr: `[Importé] ${key}`,
          descriptionEn: text.substring(0, 500).replace(/\n/g, " "),
          descriptionFr: "Scénario complet",
          timeLimit: 120,
          totalQuestions: 20,
          passingScore: 70.0,
          order: nextExamId,
        })
        .onConflictDoNothing();
      console.log(`Inserted EXAM: ${key}`);
    } else {
      await db
        .insert(labs)
        .values({
          id: nextLabId++,
          titleEn: `[Imported] ${key}`,
          titleFr: `[Importé] ${key}`,
          descriptionEn: "Imported PDF/DOCX content",
          descriptionFr: "Contenu document importé",
          difficulty: "hard",
          estimatedDuration: 60,
          objectivesEn:
            "Practice tasks extracted from document: " +
            text.substring(0, 300).replace(/\n/g, " "),
          objectivesFr: "Pratique",
          instructions: text,
          order: nextLabId,
          chapterId: 1,
        })
        .onConflictDoNothing();
      console.log(`Inserted LAB: ${key}`);
    }
  }

  console.log("Done inserting.");
}

run().catch(console.error);
