/*
 * Copyright Digital Optimization Group LLC
 * 2019 - present
 */
var webpack = require("webpack");
var MemoryFileSystem = require("memory-fs");
var memoryFs = new MemoryFileSystem();
var fs = require("fs");
//var prettyBytes = require("pretty-bytes");
const path = require("path");
const rimraf = require("rimraf");
import { bundleAssets } from "./bundle-assets";
const exec = require("child_process").exec;

/*
This needs to:

1. bundle up the /build folder into a single script
2. load the config
3. have a script that we give webpack as the root to build that will export a 'handler' function
4. return the final script from the "build" function

*/

const webpackConfig = {
  entry: { worker: path.resolve(__dirname, "scripts/src/index.js") },
  target: "webworker",
  watch: true,
  watchOptions: {
    ignored: /node_modules/
  },
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

export const build = async configFile => {
  // run npm run build
  // exec(`npm run build`)

  const compiler = webpack(webpackConfig);
  compiler.inputFileSystem = fs;
  compiler.resolvers.normal.fileSystem = memoryFs;
  compiler.outputFileSystem = memoryFs;

  rimraf.sync(path.resolve(__dirname, "tmp-dog-build"));
  fs.mkdirSync(path.resolve(__dirname, "tmp-dog-build"));

  configFile = configFile || "./dog-app-config.js";
  if (configFile !== undefined) {
    try {
      config = fs.readFileSync(configFile, "utf8");
    } catch (e) {}
  }

  fs.writeFileSync(
    path.resolve(__dirname, "tmp-dog-build/entry.js"),
    `var config = require("./dog-app-config");
var script = require("@digitaloptgroup/cra-template");
    
module.exports = {
   handler: script.setUp({ ...config, assets })
};`
  );

  let functionFile = `export const functions = {}`;
  if (functionsFile !== undefined) {
    try {
      functionFile = fs.readFileSync(functionsFile, "utf8");
    } catch (e) {}
  }

  fs.writeFileSync(
    path.resolve(__dirname, "tmp-dog-build/functions.js"),
    functionFile
  );

  const assets = bundleAssets(buildDir);

  fs.writeFileSync(
    path.resolve(__dirname, "tmp-dog-build/client-assets.js"),
    assets
  );

  const finalScript = await new Promise((res, rej) => {
    compiler.run((err, stats) => {
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
};
