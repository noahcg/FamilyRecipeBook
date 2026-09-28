export const RECIPE_QUANTITY_PATTERN =
  "^(?:\\s*|.*(?:[0-9¼½¾⅓⅔⅛⅜⅝⅞]|\\b(?:one|two|three|four|five|six|seven|eight|nine|ten|half|quarter)\\b).*)$";

export function isValidRecipeQuantity(value: string) {
  return new RegExp(RECIPE_QUANTITY_PATTERN, "i").test(value);
}

export const recipeIdeaJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "source_name",
    "story",
    "prep_minutes",
    "cook_minutes",
    "servings",
    "category",
    "tags",
    "ingredients",
    "instructions",
  ],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    description: { type: "string", maxLength: 500 },
    source_name: { type: "string", maxLength: 100 },
    story: { type: "string", maxLength: 2000 },
    prep_minutes: { type: "integer", minimum: 0, maximum: 10080 },
    cook_minutes: { type: "integer", minimum: 0, maximum: 10080 },
    servings: { type: "integer", minimum: 1, maximum: 100 },
    category: { type: "string", maxLength: 60 },
    tags: {
      type: "array",
      maxItems: 5,
      items: { type: "string", maxLength: 30 },
    },
    ingredients: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quantity", "unit", "item", "note"],
        properties: {
          quantity: {
            type: "string",
            maxLength: 20,
          },
          unit: { type: "string", maxLength: 30 },
          item: { type: "string", minLength: 1 },
          note: { type: "string", maxLength: 200 },
        },
      },
    },
    instructions: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["body"],
        properties: {
          body: { type: "string", minLength: 1 },
        },
      },
    },
  },
} as const;

export function buildRecipeIdeaJsonSchema(categories: string[]) {
  const list = categories.length ? categories : ["Other"];
  return {
    ...recipeIdeaJsonSchema,
    properties: {
      ...recipeIdeaJsonSchema.properties,
      category: { type: "string", maxLength: 60, enum: list },
    },
  };
}
