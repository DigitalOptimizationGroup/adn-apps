/*
 * Copyright Digital Optimization Group LLC
 * 2019 - present
 */
import mime from "mime";
import { perfHead, perfBody, bodyHash } from "@digitaloptgroup/rum";

export const setup = config => {
  return async (event, context) => {
    const request = event.request;
    const { assets, preCacheManifest } = config;

    const {
      userId,
      requestId,
      params,
      cookies,
      setCookie,
      prepareCmsCache,
      pathname,
      headers,
      projectId,
      gifLoggerUrl,
      color
    } = context;

    // this needs routes as well, because this will break right now unless we serve index.thml
    // for anything that we don't find?
    const appPaths = Object.keys(preCacheManifest);
    const assetToServe = `/build${
      appPaths.indexOf(pathname) > -1 ? "/index.html" : pathname
    }`;

    const perfBodyScriptUrl = `/build/perf-${bodyHash}.js`;

    var responseString = assets[assetToServe]
      ? pathname.match(/\.(ico|gif|png|jpe?g|svg)$/i) !== null
        ? new Buffer(assets[assetToServe], "base64")
        : assets[assetToServe]
      : "404 - Not Found";

    if (pathname === perfBodyScriptUrl) {
      responseString = perfBody;
    }

    if (assetToServe === "/build/index.html") {
      const placeHolder = `<div id="root"></div>`; //"{{__APP_CACHE__}}";
      const cacheData = await prepareCmsCache(
        pathname,
        userId,
        preCacheManifest
      );

      const requestContext = {
        rid: headers.get("request-id"),
        vid: userId,
        startTimestamp: Date.now(),
        projectId,
        gifLoggerUrl,
        color
      };

      return new Response(
        responseString
          // inject into the head
          .replace(
            "<head>",
            `<head><script>window.__APP_CONFIG__=${JSON.stringify(
              requestContext
            )}</script><script>${perfHead}</script>`
          )
          // inject into the body
          .replace(
            placeHolder,
            `${placeHolder}<script>window.__APP_CACHE__=${JSON.stringify(
              cacheData
            )}</script><script defer src="${perfBodyScriptUrl}"></script>`
          ),
        {
          status: assets[assetToServe] ? 200 : 404,
          headers: new Headers({
            "content-type": "text/html",
            "cache-control": "no-cache"
          })
        }
      );
    }

    const res = new Response(responseString, {
      status: responseString === "404 - Not Found" ? 404 : 200,
      headers: new Headers({
        "content-type": mime.getType(assetToServe)
      })
    });

    if (pathname === "/" || pathname.includes("service-worker.js")) {
      res.headers.set("cache-control", "no-cache");
    } else {
      res.headers.set("cache-control", "public, max-age=31536000");
    }

    return res;
  };
};
