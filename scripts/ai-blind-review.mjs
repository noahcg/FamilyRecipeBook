import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.resolve(root, process.argv[2] ?? "");
if (!process.argv[2] || !reportPath.startsWith(path.join(root, "reports/ai-eval"))) {
  throw new Error("Pass a JSON report under reports/ai-eval.");
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
const reviewCaseIds = [
  "generation-chicken-rice",
  "generation-vegan-lentil",
  "generation-allergy-conflict",
  "generation-thirty-minutes",
  "generation-budget",
  "generation-dairy-free",
  "generation-unicode-fraction",
  "generation-kids-lunch",
];
const models = [...report.models];
const seed = createHash("sha256").update(report.createdAt).digest();
models.sort((left, right) => {
  const leftIndex = report.models.indexOf(left);
  const rightIndex = report.models.indexOf(right);
  return seed[leftIndex] - seed[rightIndex];
});
const labels = Object.fromEntries(models.map((model, index) => [model, `Model ${String.fromCharCode(65 + index)}`]));
const key = Object.fromEntries(Object.entries(labels).map(([model, label]) => [label, model]));

const lines = [
  "# Blinded AI recipe quality review",
  "",
  `Source report: ${path.basename(reportPath)}. Review ${reviewCaseIds.length} synthetic cases without opening the adjacent review-key file.`,
  "",
  "Score each output from 1–5 for recipe usefulness, ingredient realism, instruction clarity, family-cookbook tone, and faithful handling of constraints. Any lost ingredient, unsafe dietary/allergen violation, or unusable instruction is an automatic rejection regardless of average score.",
  "",
];

for (const caseId of reviewCaseIds) {
  lines.push(`## ${caseId}`, "");
  for (const model of models) {
    const result = report.results.find((item) => item.caseId === caseId && item.model === model);
    const reviewOutput = result?.evaluation?.parsedOutput ?? result?.output;
    lines.push(`### ${labels[model]}`, "", "```json", JSON.stringify(reviewOutput ?? { error: result?.errorCategory ?? "missing" }, null, 2), "```", "", "Score (1–5):", "", "Rationale:", "");
  }
}

lines.push("## Decision", "", "Preferred label(s):", "", "Rejected label(s) and why:", "", "Reviewer and date:", "");

const base = reportPath.replace(/\.json$/, "");
await writeFile(`${base}-human-review.md`, lines.join("\n"));
await writeFile(`${base}-review-key.json`, `${JSON.stringify(key, null, 2)}\n`);
console.log(`Wrote blinded review worksheet and separate key for ${path.basename(reportPath)}.`);
