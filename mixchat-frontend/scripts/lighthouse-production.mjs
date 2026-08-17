import { mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const baseUrl = (
  process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const outputDirectory = resolve(
  process.env.LIGHTHOUSE_OUTPUT_DIR ?? ".lighthouse",
);
const routes = ["login", "register", "splash"];
const budgets = {
  performance: 0.85,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95,
  "first-contentful-paint": 2_500,
  "largest-contentful-paint": 4_500,
  "total-blocking-time": 300,
  "cumulative-layout-shift": 0.1,
};

mkdirSync(outputDirectory, { recursive: true });

let failed = false;
for (const route of routes) {
  const outputPath = resolve(outputDirectory, `${route}.json`);
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/lighthouse/cli/index.js",
      `${baseUrl}/${route}`,
      "--quiet",
      "--output=json",
      `--output-path=${outputPath}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--chrome-flags=--headless --no-sandbox",
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const report = JSON.parse(readFileSync(outputPath, "utf8"));
  const measured = {
    performance: report.categories.performance.score,
    accessibility: report.categories.accessibility.score,
    "best-practices": report.categories["best-practices"].score,
    seo: report.categories.seo.score,
    "first-contentful-paint":
      report.audits["first-contentful-paint"].numericValue,
    "largest-contentful-paint":
      report.audits["largest-contentful-paint"].numericValue,
    "total-blocking-time": report.audits["total-blocking-time"].numericValue,
    "cumulative-layout-shift":
      report.audits["cumulative-layout-shift"].numericValue,
  };

  for (const [metric, budget] of Object.entries(budgets)) {
    const actual = measured[metric];
    const isScore = metric in report.categories;
    const withinBudget = isScore ? actual >= budget : actual <= budget;
    if (!withinBudget) {
      failed = true;
      console.error(`${route}: ${metric} ${actual} exceeded budget ${budget}`);
    }
  }

  console.log(JSON.stringify({ route, ...measured }));
}

if (failed) {
  process.exitCode = 1;
}
