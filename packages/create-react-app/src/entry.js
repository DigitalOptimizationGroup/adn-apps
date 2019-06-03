import config from "../dog-app-config.json";
import { setup } from "@digitaloptgroup/adn-apps-cra/lib/script";
import assets from "./client-assets";

module.exports = {
  handler: setup({ ...config, assets })
};
