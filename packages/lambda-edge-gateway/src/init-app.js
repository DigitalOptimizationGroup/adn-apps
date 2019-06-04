const path = require("path");
const fs = require("fs");

export const initApp = () => {
  console.log("Initializing application for Edge Lambda Gateway...");
  console.log();
  const userDir = process.cwd();

  fs.copyFileSync(
    path.resolve(__dirname, "../app-config.json"),
    path.join(userDir, "dog-app-config.json")
  );

  fs.appendFileSync(path.join(userDir, "./.gitignore"), ".dog");

  console.log(`
Initialization complete. Config file create at: 

${path.join(userDir, "dog-app-config.json")}

Edit this config as needed for your application.

See README at: https://www.npmjs.com/package/@digitaloptgroup/adn-apps-adn-apps-lambda-edge-gateway

This App may also be configured with environment variables:

DOG_CLI_LAMBDA_FUNCTION_ARN=
DOG_CLI_AWS_REGION=
DOG_CLI_ACCESS_KEY_ID=
DOG_CLI_SECRET_ACCESS_KEY=
# optional, for uploading lambda with an assumed role
# DOG_CLI_ASSUME_ACCOUNT_ARN=
`);
};
