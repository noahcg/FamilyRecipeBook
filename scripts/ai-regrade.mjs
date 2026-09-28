import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  EVALUATOR_VERSION,
  evaluateCase,
  reportMarkdown,
  summarizeResults,
} from "./ai-eval-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.resolve(root, process.argv[2] ?? "");
if (!process.argv[2] || !reportPath.startsWith(path.join(root, "reports/ai-eval"))) {
  throw new Error("Pass a JSON report under reports/ai-eval.");
}

const cases = JSON.parse(
  await readFile(path.join(root, "evals/ai/recipe-tasks.cases.json"), "utf8")
);
const caseById = new Map(cases.map((testCase) => [testCase.id, testCase]));
const report = JSON.parse(await readFile(reportPath, "utf8"));
report.evaluatorVersion = EVALUATOR_VERSION;

report.results = report.results.map((result) => {
  if (!result.callSuccess) return result;
  const testCase = caseById.get(result.caseId);
  if (!testCase) throw new Error(`Missing case ${result.caseId}.`);
  return { ...result, evaluation: evaluateCase(testCase, result.output) };
});
report.summary = summarizeResults(report.results);

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(reportPath.replace(/\.json$/, ".md"), reportMarkdown(report));
console.log(`Regraded ${path.relative(root, reportPath)} without live calls.`);
