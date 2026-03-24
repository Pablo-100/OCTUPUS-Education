import "dotenv/config";
import { getDb } from "./server/db.ts";
import { labs } from "./drizzle/schema.ts";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("No DB available");
    return;
  }

  const rawData = fs.readFileSync(
    path.join(__dirname, "extracted_content.json"),
    "utf8"
  );
  const data = JSON.parse(rawData);

  console.log("Fixing labs...");

  // Since we inserted labs by iterating through data keys incrementally starting at id=100
  // Instead of relying on ID, we can match by titleEn `[Imported] [filename]`

  for (const item of data) {
    const title = item.title;
    const content = item.content;
    const type = item.type;

    if (type !== "exam") {
      try {
        // Try parsing content to format into nice steps
        // The content is raw text from pdf or docx, so we'll wrap it in a proper JSON structure
        // to make LabDetail.tsx happy without "falling back to comma splits"
        let steps = content
          .split("\n")
          .filter(l => l.trim().length > 10)
          .map(line => ({
            title: "Task",
            description: line.trim(),
          }));

        const cleanJsonStr = JSON.stringify(steps);

        await db
          .update(labs)
          .set({
            instructionsEn: cleanJsonStr,
            instructionsFr: cleanJsonStr,
            objectivesEn: "Practical hands-on lab",
            descriptionEn: item.title,
          })
          .where(eq(labs.titleEn, `[Imported] ${item.title}`));
        console.log(`Updated LAB: ${item.title}`);
      } catch (err) {
        console.error(err);
      }
    }
  }

  console.log("Finished fixing labs");
  process.exit(0);
}

run().catch(console.error);
