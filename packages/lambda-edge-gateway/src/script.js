/*
 * Copyright Digital Optimization Group LLC
 * 2019 - present
 */
import { AwsClient } from "aws4fetch";

export const setup = config => {
  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
  });

  const LAMBDA_INVOKE_URL = `https://lambda.${
    config.region
  }.amazonaws.com/2015-03-31/functions/${config.newArn}/invocations`;

  return async (event, context) => {
    const { request } = event;
    const { method } = request;

    const { logger } = context;

    if (method === "OPTIONS") {
      const headers = new Headers();
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
      headers.set("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
      headers.set("Access-Control-Max-Age", "86400");
      return new Response("", {
        headers
      });
    }

    const requestForLambda = await toLambdaEvent(request);

    logger({
      ...requestForLambda,
      body:
        (requestForLambda.body && requestForLambda.body.slice(150)) ||
        "undefined"
    });

    const lambdaResponse = await aws.fetch(LAMBDA_INVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestForLambda)
    });

    if (lambdaResponse.status === 200) {
      const { statusCode: status, headers, body } = await lambdaResponse.json();

      logger({
        status,
        body: body || "undefined",
        requestPath: requestForLambda.path
      });

      return new Response(body || "", { status, headers });
    } else {
      // lambda errored
      logger({
        status: lambdaResponse.status,
        lambdaResponse,
        requestPath: requestForLambda.path
      });

      const headers = new Headers();
      headers.set("Content-Type", "application/json; charset=utf-8");
      return new Response(
        JSON.stringify({ message: lambdaResponse.statusText }),
        { status: lambdaResponse.status, headers }
      );
    }
  };

  async function toLambdaEvent(request) {
    const url = new URL(request.url);
    return {
      httpMethod: request.method,
      path: url.pathname,
      queryStringParameters: [...url.searchParams].reduce(
        (obj, [key, val]) => ({ ...obj, [key]: val }),
        {}
      ),
      headers: [...request.headers].reduce(
        (obj, [key, val]) => ({ ...obj, [key]: val }),
        {}
      ),
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.text()
    };
  }
};
