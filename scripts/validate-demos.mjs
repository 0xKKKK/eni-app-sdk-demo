import { readFileSync } from "node:fs";

const requiredApps = [
  {
    path: "apps/widgets-react-demo",
    packageName: "widgets-react-demo",
    sdkPackage: "@eni-chain/app-sdk-widgets-react",
    widgetVersion: "0.1.1",
  },
  {
    path: "apps/widgets-vue-demo",
    packageName: "widgets-vue-demo",
    sdkPackage: "@eni-chain/app-sdk-widgets-vue",
    widgetVersion: "0.1.2",
  },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

for (const app of requiredApps) {
  const packageJson = readJson(`${app.path}/package.json`);
  const viteConfig = readText(`${app.path}/vite.config.ts`);

  if (packageJson.name !== app.packageName) {
    throw new Error(`${app.path} package name must be ${app.packageName}`);
  }

  if (packageJson.dependencies?.["@eni-chain/app-sdk"] !== "0.1.1") {
    throw new Error(`${app.path} must use @eni-chain/app-sdk from npm`);
  }

  if (packageJson.dependencies?.[app.sdkPackage] !== app.widgetVersion) {
    throw new Error(`${app.path} must use ${app.sdkPackage} from npm`);
  }

  if (viteConfig.includes("packages/") || viteConfig.includes("workspace")) {
    throw new Error(`${app.path} must not use private workspace aliases`);
  }
}

console.log("demo validation passed");
