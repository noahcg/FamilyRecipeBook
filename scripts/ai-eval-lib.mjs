export const EVALUATOR_VERSION = "recipe-tasks-v3";

export const MODEL_PRICING = {
  "@cf/meta/llama-3.1-8b-instruct-fast": {
    inputUsdPerMillion: 0.045,
    outputUsdPerMillion: 0.384,
    inputNeuronsPerMillion: 4119,
    outputNeuronsPerMillion: 34868,
    pricingNote: "Estimate uses Cloudflare's listed FP8-fast rate for the active -fast alias.",
  },
  "@cf/google/gemma-4-26b-a4b-it": {
    inputUsdPerMillion: 0.1,
    outputUsdPerMillion: 0.3,
    inputNeuronsPerMillion: 9091,
    outputNeuronsPerMillion: 27273,
  },
  "@cf/zai-org/glm-4.7-flash": {
    inputUsdPerMillion: 0.06,
    outputUsdPerMillion: 0.4,
    inputNeuronsPerMillion: 5500,
    outputNeuronsPerMillion: 36400,
  },
  "@cf/nvidia/nemotron-3-120b-a12b": {
    inputUsdPerMillion: 0.5,
    outputUsdPerMillion: 1.5,
    inputNeuronsPerMillion: 45455,
    outputNeuronsPerMillion: 136364,
  },
};

export const PASS_THRESHOLDS = {
  minimumOverallPassRate: 0.9,
  minimumRecipeSchemaRate: 0.95,
  maximumCriticalConstraintFailures: 0,
  maximumErrorRate: 0.05,
};

export function extractJsonObject(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

export function extractCloudflareOutput(json) {
  return json?.result?.response ?? json?.result?.choices?.[0]?.message?.content ?? null;
}

export function extractUsage(json) {
  const usage = json?.result?.usage ?? json?.usage ?? {};
  return {
    inputTokens: Number.isFinite(usage.prompt_tokens) ? usage.prompt_tokens : usage.input_tokens,
    outputTokens: Number.isFinite(usage.completion_tokens) ? usage.completion_tokens : usage.output_tokens,
    totalTokens: usage.total_tokens,
  };
}

function textIncludes(text, term) {
  return text.toLowerCase().includes(term.toLowerCase());
}

function textIncludesWholeTerm(text, term) {
  const escaped = escapeRegExp(term.toLowerCase());
  return new RegExp(`(^|\\W)${escaped}(?:es|s)?(?=$|\\W)`, "i").test(text);
}

const INGREDIENT_ALIASES = {
  pasta: ["pasta", "spaghetti", "penne", "linguine", "fettuccine", "rigatoni", "macaroni", "noodle"],
};

function includesIngredient(ingredients, term) {
  const aliases = INGREDIENT_ALIASES[term.toLowerCase()] ?? [term];
  return aliases.some((alias) => textIncludes(ingredients, alias));
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function stringWithin(value, maximum, minimum = 0) {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum;
}

function recipeShape(recipe, categories) {
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) return false;
  if (!hasOnlyKeys(recipe, ["title", "description", "source_name", "story", "prep_minutes", "cook_minutes", "servings", "category", "tags", "ingredients", "instructions"])) return false;
  if (!stringWithin(recipe.title, 200, 1) || !recipe.title.trim()) return false;
  if (!stringWithin(recipe.description, 500)) return false;
  if (!stringWithin(recipe.source_name, 100)) return false;
  if (!stringWithin(recipe.story, 2_000)) return false;
  if (!Number.isInteger(recipe.prep_minutes) || recipe.prep_minutes < 0 || recipe.prep_minutes > 10_080) return false;
  if (!Number.isInteger(recipe.cook_minutes) || recipe.cook_minutes < 0 || recipe.cook_minutes > 10_080) return false;
  if (!Number.isInteger(recipe.servings) || recipe.servings < 1 || recipe.servings > 100) return false;
  if (!stringWithin(recipe.category, 60) || !categories.includes(recipe.category)) return false;
  if (!Array.isArray(recipe.tags) || recipe.tags.length > 5 || !recipe.tags.every((tag) => stringWithin(tag, 30))) return false;
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 4 || recipe.ingredients.length > 8) return false;
  if (!recipe.ingredients.every((ingredient) =>
    ingredient &&
    typeof ingredient === "object" &&
    !Array.isArray(ingredient) &&
    hasOnlyKeys(ingredient, ["quantity", "unit", "item", "note"]) &&
    stringWithin(ingredient.quantity, 20) &&
    stringWithin(ingredient.unit, 30) &&
    typeof ingredient.item === "string" &&
    ingredient.item.trim() &&
    stringWithin(ingredient.note, 200)
  )) return false;
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length < 3 || recipe.instructions.length > 6) return false;
  return recipe.instructions.every((step) =>
    step &&
    typeof step === "object" &&
    !Array.isArray(step) &&
    hasOnlyKeys(step, ["body"]) &&
    typeof step.body === "string" &&
    step.body.trim()
  );
}

function recipeText(recipe) {
  if (!recipe || typeof recipe !== "object") return "";
  return [
    recipe.title,
    recipe.description,
    recipe.story,
    ...(Array.isArray(recipe.tags) ? recipe.tags : []),
    ...(Array.isArray(recipe.ingredients)
      ? recipe.ingredients.flatMap((ingredient) => [ingredient?.item, ingredient?.note])
      : []),
    ...(Array.isArray(recipe.instructions)
      ? recipe.instructions.map((instruction) => instruction?.body)
      : []),
  ].filter((value) => typeof value === "string").join(" ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removePermittedMentions(text, term, allowedPhrases) {
  let normalized = text.toLowerCase();
  for (const phrase of allowedPhrases) normalized = normalized.replaceAll(phrase.toLowerCase(), "");
  const escaped = escapeRegExp(term.toLowerCase());
  const pluralTerm = `${escaped}(?:es|s)?`;
  const negatedMentions = [
    `\\b(?:no|without)\\s+(?:any\\s+)?${pluralTerm}(?:\\s+(?:or|and)\\s+${escaped}\\s+substitutes?(?:\\s+containing\\s+${pluralTerm})?)?\\b`,
    `\\b(?:excluding|exclude|free of)\\s+(?:any\\s+)?${pluralTerm}\\b`,
    `\\b${escaped}[- ]free\\b`,
    `\\bdoes not contain\\s+${pluralTerm}\\b`,
    `\\bout of\\s+${pluralTerm}\\b`,
  ];
  for (const pattern of negatedMentions) normalized = normalized.replace(new RegExp(pattern, "gi"), "");
  return normalized;
}

function quantityMatches(actual, accepted) {
  const normalized = String(actual ?? "").trim().replace(/^\./, "0.");
  return accepted.some((value) => normalized === String(value).trim().replace(/^\./, "0."));
}

function usableQuantity(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return /[0-9¼½¾⅓⅔⅛⅜⅝⅞]/.test(normalized) ||
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|half|quarter)\b/.test(normalized);
}

function normalizedInstruction(body) {
  return String(body ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function evaluateCase(testCase, output) {
  const failures = [];
  const invariants = testCase.invariants ?? {};

  if (testCase.task === "recipeGeneration") {
    let recipe = output;
    if (typeof recipe === "string") {
      try {
        recipe = JSON.parse(extractJsonObject(recipe));
      } catch {
        failures.push("invalid_json");
        return { pass: false, schemaPass: false, criticalFailure: true, failures };
      }
    }
    const schemaPass = recipeShape(recipe, testCase.categories);
    if (!schemaPass) failures.push("invalid_recipe_schema");
    const ingredientItems = Array.isArray(recipe?.ingredients)
      ? recipe.ingredients.map((item) => String(item?.item ?? ""))
      : [];
    const ingredients = ingredientItems.join(" ");
    const allRecipeText = recipeText(recipe);
    for (const term of invariants.requiredIngredients ?? []) {
      if (!includesIngredient(ingredients, term)) failures.push(`missing_ingredient:${term}`);
    }
    for (const term of invariants.forbiddenIngredients ?? []) {
      const checkedText = removePermittedMentions(
        allRecipeText,
        term,
        invariants.allowedForbiddenPhrases ?? []
      );
      if (textIncludesWholeTerm(checkedText, term)) failures.push(`forbidden_ingredient:${term}`);
    }
    for (const term of invariants.forbiddenOutputTerms ?? []) {
      if (textIncludes(allRecipeText, term)) failures.push(`forbidden_output:${term}`);
    }
    if (invariants.noUnverifiedSafetyClaim && /allerg(?:y|en)[ -](?:safe|friendly)|safe for (?:people|anyone|those) with/i.test(allRecipeText)) {
      failures.push("unverified_safety_claim");
    }
    const quantifiedIngredients = Array.isArray(recipe?.ingredients)
      ? recipe.ingredients.filter((ingredient) => usableQuantity(ingredient?.quantity)).length
      : 0;
    const minimumQuantifiedIngredients = invariants.minimumQuantifiedIngredients ?? 3;
    if (quantifiedIngredients < minimumQuantifiedIngredients) {
      failures.push(`quantified_ingredients:${quantifiedIngredients}`);
    }
    if (Array.isArray(recipe?.ingredients)) {
      for (const ingredient of recipe.ingredients) {
        const quantity = String(ingredient?.quantity ?? "").trim();
        if (quantity && !usableQuantity(quantity)) {
          failures.push(`invalid_quantity:${ingredient?.item ?? "unknown"}`);
        }
      }
    }
    for (const expected of invariants.ingredientQuantities ?? []) {
      const ingredient = Array.isArray(recipe?.ingredients)
        ? recipe.ingredients.find((candidate) => textIncludes(String(candidate?.item ?? ""), expected.item))
        : undefined;
      if (!ingredient || !quantityMatches(ingredient.quantity, expected.accepted)) {
        failures.push(`ingredient_quantity:${expected.item}`);
      }
    }
    const instructionText = Array.isArray(recipe?.instructions)
      ? recipe.instructions.map((instruction) => String(instruction?.body ?? "")).join(" ")
      : "";
    for (const term of invariants.requiredInstructionIngredients ?? []) {
      if (!includesIngredient(instructionText, term)) {
        failures.push(`missing_instruction_ingredient:${term}`);
      }
    }
    if (Array.isArray(recipe?.instructions)) {
      const normalizedSteps = recipe.instructions.map((instruction) => normalizedInstruction(instruction?.body));
      if (normalizedSteps.some(Boolean) && new Set(normalizedSteps).size !== normalizedSteps.length) {
        failures.push("duplicate_instructions");
      }
    }
    if (invariants.servings !== undefined && recipe?.servings !== invariants.servings) {
      failures.push(`servings:${recipe?.servings ?? "missing"}`);
    }
    const totalMinutes = Number(recipe?.prep_minutes) + Number(recipe?.cook_minutes);
    if (invariants.maxTotalMinutes !== undefined && (!Number.isFinite(totalMinutes) || totalMinutes > invariants.maxTotalMinutes)) {
      failures.push(`total_minutes:${totalMinutes}`);
    }
    const criticalFailure = failures.some((failure) =>
      /invalid_|missing_ingredient|missing_instruction_ingredient|duplicate_instructions|forbidden_ingredient|forbidden_output|unverified_safety|quantified_ingredients|ingredient_quantity|servings|total_minutes/.test(failure)
    );
    return { pass: failures.length === 0, schemaPass, criticalFailure, failures, parsedOutput: recipe };
  }

  const text = typeof output === "string" ? output.trim() : String(output ?? "").trim();
  if (!text) failures.push("empty_output");
  if (testCase.task === "recipeDescription") {
    const count = wordCount(text);
    if (count < invariants.minWords) failures.push(`too_short:${count}`);
    if (count > invariants.maxWords) failures.push(`too_long:${count}`);
    if (/^#|```|\n\s*[-*]\s/.test(text)) failures.push("formatting_noise");
  } else if (testCase.task === "recipeImageSearchQuery") {
    const count = wordCount(text);
    if (count < invariants.minWords || count > invariants.maxWords) failures.push(`word_count:${count}`);
    if (/[.!?,;:"'`]/.test(text)) failures.push("punctuation");
  } else if (testCase.task === "recipeImageRanking") {
    const selected = Number.parseInt(text.replace(/\D/g, ""), 10);
    if (selected !== invariants.expectedIndex) failures.push(`selected:${selected || "invalid"}`);
  }
  return { pass: failures.length === 0, criticalFailure: false, failures, parsedOutput: text };
}

export function estimateUsage(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;
  return {
    usd: (inputTokens * pricing.inputUsdPerMillion + outputTokens * pricing.outputUsdPerMillion) / 1_000_000,
    neurons: (inputTokens * pricing.inputNeuronsPerMillion + outputTokens * pricing.outputNeuronsPerMillion) / 1_000_000,
    pricingNote: pricing.pricingNote,
  };
}

export function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1);
  return sorted[index];
}

export function summarizeResults(results) {
  const summaries = {};
  for (const model of [...new Set(results.map((result) => result.model))]) {
    const modelResults = results.filter((result) => result.model === model);
    const successfulCalls = modelResults.filter((result) => result.callSuccess);
    const evaluated = successfulCalls.filter((result) => result.evaluation);
    const inputTokens = successfulCalls.reduce((sum, result) => sum + (result.usage?.inputTokens || 0), 0);
    const outputTokens = successfulCalls.reduce((sum, result) => sum + (result.usage?.outputTokens || 0), 0);
    summaries[model] = {
      calls: modelResults.length,
      callSuccesses: successfulCalls.length,
      errorRate: modelResults.length ? (modelResults.length - successfulCalls.length) / modelResults.length : 0,
      passRate: evaluated.length ? evaluated.filter((result) => result.evaluation.pass).length / evaluated.length : 0,
      recipeSchemaRate: (() => {
        const recipeResults = evaluated.filter((result) => result.task === "recipeGeneration");
        return recipeResults.length
          ? recipeResults.filter((result) => result.evaluation.schemaPass).length / recipeResults.length
          : 0;
      })(),
      criticalFailures: evaluated.filter((result) => result.evaluation.criticalFailure).length,
      latencyMs: {
        p50: percentile(successfulCalls.map((result) => result.durationMs), 0.5),
        p95: percentile(successfulCalls.map((result) => result.durationMs), 0.95),
      },
      usage: { inputTokens, outputTokens, ...estimateUsage(model, inputTokens, outputTokens) },
      taskPassRates: Object.fromEntries(
        [...new Set(modelResults.map((result) => result.task))].map((task) => {
          const taskResults = evaluated.filter((result) => result.task === task);
          return [task, taskResults.length ? taskResults.filter((result) => result.evaluation.pass).length / taskResults.length : 0];
        })
      ),
    };
  }
  return summaries;
}

export function reportMarkdown(report) {
  const lines = [
    `# Workers AI evaluation — ${report.createdAt.slice(0, 10)}`,
    "",
    `Evaluator: \`${report.evaluatorVersion}\` · Prompt versions: production registry · ${report.results.length} live calls`,
    "",
    "## Predeclared gates",
    "",
    `- Overall invariant pass rate: at least ${PASS_THRESHOLDS.minimumOverallPassRate * 100}%`,
    `- Recipe schema rate: at least ${PASS_THRESHOLDS.minimumRecipeSchemaRate * 100}%`,
    `- Critical recipe constraint failures: ${PASS_THRESHOLDS.maximumCriticalConstraintFailures}`,
    `- API error rate: at most ${PASS_THRESHOLDS.maximumErrorRate * 100}%`,
    "- Human quality review: required before promoting a challenger; intentionally not represented as automated evidence.",
    "",
    "## Results",
    "",
    "| Model | Pass rate | Recipe schema | Critical failures | Error rate | p50 | p95 | Observed neurons (estimated) |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const [model, summary] of Object.entries(report.summary)) {
    lines.push(`| \`${model}\` | ${(summary.passRate * 100).toFixed(1)}% | ${(summary.recipeSchemaRate * 100).toFixed(1)}% | ${summary.criticalFailures} | ${(summary.errorRate * 100).toFixed(1)}% | ${summary.latencyMs.p50 ?? "n/a"} ms | ${summary.latencyMs.p95 ?? "n/a"} ms | ${summary.usage.neurons?.toFixed(1) ?? "n/a"} |`);
  }
  lines.push("", "## Task pass rates", "", "| Model | Generation | Description | Image query | Image ranking |", "| --- | ---: | ---: | ---: | ---: |");
  for (const [model, summary] of Object.entries(report.summary)) {
    const rate = (task) => summary.taskPassRates[task] === undefined ? "n/a" : `${(summary.taskPassRates[task] * 100).toFixed(1)}%`;
    lines.push(`| \`${model}\` | ${rate("recipeGeneration")} | ${rate("recipeDescription")} | ${rate("recipeImageSearchQuery")} | ${rate("recipeImageRanking")} |`);
  }
  lines.push("", "## Failures", "");
  const failures = report.results.filter((result) => !result.callSuccess || !result.evaluation?.pass);
  if (!failures.length) lines.push("No API or invariant failures.");
  else for (const failure of failures) lines.push(`- ${failure.caseId} · \`${failure.model}\`: ${failure.errorCategory ?? failure.evaluation?.failures.join(", ")}`);
  lines.push(
    "",
    "## Decision status",
    "",
    "Model selection is intentionally not generated from these automated scores. Record the current decision and required blinded human-review status in `docs/ai-model-review.md` after inspecting the report.",
    "",
    "## Interpretation",
    "",
    "This report uses synthetic prompts and objective contract checks. Recipe checks enforce the structured response contract, require usable ingredient quantities, scan all generated recipe text for forbidden terms while permitting explicit negations and declared phrases, and treat common pasta names as equivalents. Generated outputs remain in the JSON report for blinded human review. A model is not promoted solely because it is newer, cheaper, or faster.",
    ""
  );
  return lines.join("\n");
}
