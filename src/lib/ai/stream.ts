// Handles split UTF-8 characters, CRLF, and SSE frames crossing network chunks.
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onData: (data: string) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  function line(value: string) {
    if (value === "") {
      if (data.length) onData(data.join("\n"));
      data = [];
    } else if (value.startsWith("data:")) {
      data.push(value.slice(5).replace(/^ /, ""));
    }
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, end).replace(/\r$/, ""));
        buffer = buffer.slice(end + 1);
      }
      if (done) break;
    }
    if (buffer) line(buffer.replace(/\r$/, ""));
    line("");
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

export type RecipePreview = {
  title?: string;
  description?: string;
  ingredients: { quantity: string; unit: string; item: string; note: string }[];
  instructions: { body: string }[];
};

// Only expose fully received strings/objects. Partial JSON is never a recipe.
export function recipePreview(text: string): RecipePreview {
  const preview: RecipePreview = { ingredients: [], instructions: [] };
  let quoted = false;
  let escaped = false;
  const stack: string[] = [];
  let boundary = -1;
  let snapshot: Record<string, unknown> = {};
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === "{" || character === "[") stack.push(character);
    else if (character === "}" || character === "]") stack.pop();
    if (!quoted && (character === '"' || character === "}" || character === "]")) {
      // A closing string may be a key; JSON.parse rejects those incomplete candidates.
      boundary = index;
      const closing = [...stack].reverse().map((open) => open === "{" ? "}" : "]").join("");
      try { snapshot = JSON.parse(text.slice(0, boundary + 1) + closing); } catch { /* Await more JSON. */ }
    }
  }
  if (typeof snapshot.title === "string") preview.title = snapshot.title;
  if (typeof snapshot.description === "string") preview.description = snapshot.description;
  if (Array.isArray(snapshot.ingredients)) preview.ingredients = snapshot.ingredients.filter(
    (item) => item && ["quantity", "unit", "item", "note"].every((key) => typeof item[key] === "string")
  ).slice(0, 8);
  if (Array.isArray(snapshot.instructions)) preview.instructions = snapshot.instructions.filter(
    (item) => item && typeof item.body === "string"
  ).slice(0, 6);
  return preview;
}
