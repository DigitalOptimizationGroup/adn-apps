/*
 * Copyright Digital Optimization Group LLC
 * 2019 - present
 */
var webpack = require("webpack");
var fs = require("fs");
var prettyBytes = require("pretty-bytes");
const path = require("path");
const rimraf = require("rimraf");
import { uploadToLambda } from "./upload-to-lambda";
require("dotenv").config(path.resolve(process.cwd(), ".env"));
const prompts = require("prompts");

const buildDirectory = ".dog";

const webpackConfig = {
  entry: { worker: path.resolve(`${buildDirectory}/entry.js`) },
  target: "webworker",
  output: { libraryTarget: "commonjs2" }, // this is super required so we can import from the script when bundling the final output
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: require.resolve("babel-loader"),
          options: {
            babelrc: false,
            configFile: false,
            presets: [
              [
                require.resolve("@babel/preset-env"),
                {
                  targets: { chrome: "70" }
                }
              ]
            ],
            plugins: [
              //['@babel/plugin-transform-react-jsx'],
              require.resolve("@babel/plugin-proposal-export-default-from"),
              require.resolve("@babel/plugin-proposal-class-properties")
            ]
          }
        }
      }
    ]
  }
};

export const build = async (configFile = {}) => {
  console.log();
  console.log("Building for Application Delivery Network...");

  const functionArn =
    configFile.functionArn || process.env.DOG_CLI_LAMBDA_FUNCTION_ARN;
  const region = configFile.region || process.env.DOG_CLI_AWS_REGION;
  const assumeAccountArn =
    configFile.accountArnToAssumeForAwsDeployment ||
    process.env.DOG_CLI_ASSUME_ACCOUNT_ARN;
  const accessKeyId =
    configFile.edgeAwsAccessKeyId || process.env.DOG_CLI_ACCESS_KEY_ID;
  const secretAccessKey =
    configFile.edgeAwsSecretAccessKey || process.env.DOG_CLI_SECRET_ACCESS_KEY;

  try {
    fs.statSync(configFile.pathToZipFile);
  } catch (e) {
    console.log(`
Your zip file was not found at: ${configFile.pathToZipFile}
The App Config must set 

Exiting...
`);
    process.exit();
  }

  if (
    functionArn === undefined ||
    region === undefined ||
    accessKeyId === undefined ||
    secretAccessKey === undefined
  ) {
    console.log(`
Lambda ARN, AWS Region, and AWS Keys must be set to deploy. 

They can be set in your config file or with environment variables.

DOG_CLI_LAMBDA_FUNCTION_ARN
DOG_CLI_AWS_REGION
DOG_CLI_ASSUME_ACCOUNT_ARN
DOG_CLI_ACCESS_KEY_ID
DOG_CLI_SECRET_ACCESS_KEY
`);
    process.exit();
  }

  console.log(`
Lambda to deploy into AWS:

zipped lambda:   [${configFile.pathToZipFile}]
target lambda:   [${functionArn}]
`);

  const response = await prompts({
    type: "text",
    name: "answer",
    message:
      "Enter 'yes' to deploy a new Lambda version into AWS (only 'yes' will be accepted)"
  });

  if (response.answer === "yes") {
    const newArn = await uploadToLambda(
      functionArn,
      configFile.pathToZipFile,
      region,
      assumeAccountArn
    );

    console.log(`Lambda function updated. New ARN: ${newArn}`);

    const compiler = webpack(webpackConfig);

    rimraf.sync(path.resolve(buildDirectory));
    fs.mkdirSync(path.resolve(buildDirectory));

    const config = {
      newArn,
      region,
      accessKeyId,
      secretAccessKey
    };

    fs.writeFileSync(
      path.resolve(`${buildDirectory}/config.json`),
      JSON.stringify(config)
    );

    fs.copyFileSync(
      path.resolve(__dirname, "../src/entry.js"),
      path.resolve(`${buildDirectory}/entry.js`)
    );

    const finalScript = await new Promise((res, rej) => {
      compiler.outputFileSystem = {
        // send output into the void
        mkdirp: (path, callback) => {
          callback();
        },
        join: () => {}
      };
      compiler.run((err, stats) => {
        console.log();
        // console.log(
        //   `Final bundle size: ${prettyBytes(
        //     stats.compilation.assets["worker.js"].size()
        //   )}`
        // );
        if (err) rej(err);
        const result = stats.compilation.assets["worker.js"].source();
        res(result);
      });
    });

    return finalScript;
  } else {
    console.log("Exiting...");
  }
};
