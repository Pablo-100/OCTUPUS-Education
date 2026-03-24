const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

async function extractFiles() {
  const dir = __dirname;
  const files = fs.readdirSync(dir);
  const results = {};

  for (const file of files) {
    if (file.endsWith(".pdf")) {
      try {
        const dataBuffer = fs.readFileSync(path.join(dir, file));
        const data = await pdf(dataBuffer);
        results[file] = data.text;
      } catch (err) {
        console.error("Error parsing PDF", file, err.message);
      }
    } else if (file.endsWith(".docx")) {
      try {
        const result = await mammoth.extractRawText({
          path: path.join(dir, file),
        });
        results[file] = result.value;
      } catch (err) {
        console.error("Error parsing DOCX", file, err.message);
      }
    }
  }

  fs.writeFileSync("extracted_content.json", JSON.stringify(results, null, 2));
  console.log("Extraction complete");
}

extractFiles().catch(console.error);
