import { Lambda, STS } from "aws-sdk";
import fs from "fs";

export const uploadToLambda = async (
  functionArn,
  pathToZipFile,
  region,
  ASSUME_ACCOUNT_ARN
) => {
  try {
    var lambda;
    if (ASSUME_ACCOUNT_ARN !== undefined) {
      const sts = new STS();
      const params = {
        DurationSeconds: 3600,
        RoleArn: ASSUME_ACCOUNT_ARN,
        RoleSessionName: "dev-assume-role"
      };
      const config = await new Promise((resolve, reject) => {
        sts.assumeRole(params, function(err, data) {
          if (err) reject(err);
          // an error occurred
          else if (data.Credentials !== undefined) {
            resolve({
              accessKeyId: data.Credentials.AccessKeyId,
              secretAccessKey: data.Credentials.SecretAccessKey,
              sessionToken: data.Credentials.SessionToken
            });
          } else {
            throw Error("Assumed credentials is undefined");
          }
        });
      });
      lambda = new Lambda({
        apiVersion: "2015-03-31",
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
        region
      });
    } else {
      lambda = new Lambda({
        apiVersion: "2015-03-31",
        region
      });
    }

    const ZipFile = fs.readFileSync(pathToZipFile);

    return await new Promise((resolve, reject) => {
      lambda.updateFunctionCode(
        {
          FunctionName: functionArn,
          Publish: true,
          ZipFile
        },
        (err, data) => {
          if (err) reject(err);
          else resolve(`${data.FunctionArn}`);
        }
      );
    });
  } catch (e) {
    console.log(e);
    return e;
  }
};
