import config from "./config.json";
import { setup } from "@digitaloptgroup/adn-apps-lambda-edge-gateway/lib/script";

export const handler = setup(config);
