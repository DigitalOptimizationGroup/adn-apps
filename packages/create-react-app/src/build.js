/*
 * Copyright Digital Optimization Group LLC
 * 2019 - present
 */
var webpack = require("webpack");
var fs = require("fs");
var prettyBytes = require("pretty-bytes");
const path = require("path");
const rimraf = require("rimraf");
import { bundleAssets } from "./bundle-assets";
const spawn = require("cross-spawn");

const buildDirectory = ".dog";

const webpackConfig = {
  entry: { worker: path.resolve(`${buildDirectory}/entry.js`) },
  target: "webworker",
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
  console.log();
  console.log("Running create-react-apps build process. i.e. npm run build");
  console.log();

  spawn.sync("npm", ["run", "build"], {
    stdio: "inherit",
    env: { ...process.env, GENERATE_SOURCEMAP: false } // source maps add undeeded weight at the edge -- if desired should serve from s3 or similar
  });

  console.log("Building for Application Delivery Network...");

  const compiler = webpack(webpackConfig);

  rimraf.sync(path.resolve(buildDirectory));
  fs.mkdirSync(path.resolve(buildDirectory));

  const assets = bundleAssets("./build");

  fs.writeFileSync(path.resolve(`${buildDirectory}/client-assets.js`), assets);

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
      console.log(
        `Final bundle size: ${prettyBytes(
          stats.compilation.assets["worker.js"].size()
        )}`
      );
      if (err) rej(err);
      const result = stats.compilation.assets["worker.js"].source();
      res(result);
    });
  });

  return finalScript;
};
