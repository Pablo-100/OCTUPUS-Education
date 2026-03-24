const fs = require("fs");
const data = JSON.parse(
  fs.readFileSync("./COMPLETE_COMMANDS_DATA.json", "utf-8")
);

data.commands = data.commands.map(cmd => {
  if (!cmd.examples) {
    cmd.examples =
      "Example:\n$ " +
      cmd.name +
      " " +
      (cmd.options ? cmd.options.split(",")[0].trim().split(" ")[0] : "") +
      "\n[Output of " +
      cmd.name +
      "]";
    cmd.examplesEn =
      "Example:\n$ " +
      cmd.name +
      "\n[Standard output for " +
      cmd.name +
      " goes here. e.g. success message or tabular data.]";
    cmd.examplesFr =
      "Exemple:\n$ " +
      cmd.name +
      "\n[La sortie standard pour " +
      cmd.name +
      " s'affiche ici.]";
  }
  return cmd;
});

fs.writeFileSync(
  "./COMPLETE_COMMANDS_DATA.json",
  JSON.stringify(data, null, 2)
);
console.log("Fixed json");
