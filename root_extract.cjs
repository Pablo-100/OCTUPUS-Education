const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const targetDir = path.join(__dirname, "labs & WT");
const outputFile = path.join(__dirname, "extracted_content.json");

async function parseFiles() {
  const files = fs.readdirSync(targetDir);
  const results = [];

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    const ext = path.extname(file).toLowerCase();

    // We categorize as exam or lab by looking for keywords like "wt", "exam", "test"
    const nameLower = file.toLowerCase();
    let type = "lab";
    if (
      nameLower.includes("wt") ||
      nameLower.includes("exam") ||
      nameLower.includes("test")
    ) {
      type = "exam";
    }

    try {
      let content = "";
      if (ext === ".pdf") {
        console.log(`Extracting PDF: ${file}`);
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        content = data.text;
      } else if (ext === ".docx") {
        console.log(`Extracting DOCX: ${file}`);
        const result = await mammoth.extractRawText({ path: filePath });
        content = result.value;
      } else {
        continue;
      }

      const title = path.basename(file, ext);

      results.push({
        title,
        content: content.substring(0, 50000), // restrict length if huge
        type,
        difficulty: "intermediate",
        estimatedTime: 60,
      });
      console.log(`Successfully parsed: ${file}`);
    } catch (err) {
      console.error(`Failed to parse ${file}:`, err);
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf-8");
  console.log(
    `Extraction complete. Created ${outputFile} with ${results.length} items.`
  );
}

parseFiles();
