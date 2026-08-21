import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTsModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return import(`data:text/javascript,${encodeURIComponent(outputText)}`);
}

const {
  buildDeterministicSearchQueries,
  searchRecipeImageCandidates,
  selectDefaultImageUrl,
} = await importTsModule("../src/lib/pexelsSearch.ts");

function photo(id, alt = "A homemade dish") {
  return {
    alt,
    photographer: `Photographer ${id}`,
    photographer_url: `https://www.pexels.com/@photographer-${id}`,
    url: `https://www.pexels.com/photo/${id}/`,
    src: {
      large: `https://images.pexels.com/photos/${id}/photo.jpeg`,
    },
  };
}

test("buildDeterministicSearchQueries uses title and top ingredients without AI", () => {
  const queries = buildDeterministicSearchQueries("Grandma's Chicken Pot Pie", [
    "2 cups cooked chicken",
    "fresh carrots, chopped",
    "salt",
    "frozen peas",
  ]);

  assert.equal(queries[0], "grandmas chicken pot pie cooked chicken carrots homemade");
  assert.ok(queries.includes("grandmas chicken pot pie cooked chicken"));
  assert.ok(queries.includes("homemade meal warm rustic kitchen"));
});

test("searchRecipeImageCandidates tries deterministic fallbacks when AI is unavailable", async () => {
  const seenQueries = [];
  const candidates = await searchRecipeImageCandidates({
    title: "Tomato Soup",
    ingredients: ["tomatoes", "cream"],
    fetchCandidates: async (query) => {
      seenQueries.push(query);
      return query === "tomato soup tomatoes cream homemade" ? [] : [photo(42)];
    },
    limit: 6,
  });

  assert.ok(seenQueries.length > 1);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source_url, "https://www.pexels.com/photo/42/");
});

test("selectDefaultImageUrl preserves selectRecipeImage URL compatibility", async () => {
  const candidates = await searchRecipeImageCandidates({
    title: "Apple Cake",
    ingredients: ["apples", "cinnamon"],
    fetchCandidates: async () => [photo(7), photo(8)],
  });

  assert.equal(
    selectDefaultImageUrl(candidates),
    "https://images.pexels.com/photos/7/photo.jpeg?auto=compress&cs=tinysrgb&w=900&q=80"
  );
});
