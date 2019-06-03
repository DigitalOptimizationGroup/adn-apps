const path = require("path");
const fs = require("fs");

export const initApp = () => {
  console.log("Initializing application for Create React App...");
  console.log();
  const userDir = process.cwd();

  fs.copyFileSync(
    path.resolve(__dirname, "../app-config.json"),
    path.join(userDir, "dog-app-config.json")
  );

  console.log(`
Initialization complete. Config file create at: 

${path.join(userDir, "dog-app-config.json")}

Edit this config as needed for your application.

See README at: https://www.npmjs.com/package/@digitaloptgroup/adn-apps-cra
`);
};
