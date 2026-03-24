import { getDb } from "./server/db.ts";
import { exams } from "./drizzle/schema.ts";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("No DB available");
    return;
  }

  const rawData = fs.readFileSync(
    path.join(__dirname, "new_exams_data.json"),
    "utf8"
  );
  const data = JSON.parse(rawData);

  // We want to avoid primary key collisions, so let's check max order/id or just start high
  let nextExamId = 200; // Start at 200 to be safe

  for (const item of data) {
    const title = item.titre || item.fichier;

    // We stringify the entire item content as the description because the previous one used text content
    // from pdf, but here we have structured data. For exam purposes, it's nice to have all scenarios inside descriptionEn or a specific column.
    // The previous code inserted `text.substring(0, 500)` in descriptionEn. We could do better.
    const fullText = JSON.stringify(item, null, 2);

    await db
      .insert(exams)
      .values({
        id: nextExamId++,
        titleEn: `[Imported JSON] ${title}`,
        titleFr: `[Importé JSON] ${title}`,
        descriptionEn: fullText, // storing the full JSON so it's not lost
        descriptionFr: "Scénario complet",
        timeLimit: 120,
        totalQuestions: 20,
        passingScore: 70.0,
        order: nextExamId,
      })
      .onConflictDoNothing();

    console.log(`Inserted EXAM from JSON: ${title}`);
  }

  console.log("Finished inserting new exams");
  process.exit(0);
}

run().catch(console.error);
