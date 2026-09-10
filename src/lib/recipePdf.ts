"use client";

import { jsPDF } from "jspdf";
import { formatDuration } from "@/lib/formatDuration";
import type { RecipeWithRelations } from "@/lib/types";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function safeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "recipe";
}

/** Creates a readable, paginated PDF without sending recipe content to a third party. */
export async function createRecipePdf(recipe: RecipeWithRelations): Promise<File> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const page = () => {
    pdf.addPage();
    pdf.setFillColor(39, 76, 59);
    pdf.rect(0, 0, PAGE_WIDTH, 4, "F");
    y = MARGIN;
  };
  const footer = () => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(112, 105, 93);
    pdf.text("HOME COOKED  ·  Shared from Home Cooked", MARGIN, PAGE_HEIGHT - 11);
    pdf.text("tryhomecooked.com", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 11, { align: "right" });
  };
  const room = (height: number) => { if (y + height > PAGE_HEIGHT - 19) page(); };
  const text = (value: string, size = 10, weight: "normal" | "bold" = "normal", indent = 0) => {
    pdf.setFont("helvetica", weight);
    pdf.setFontSize(size);
    pdf.setTextColor(48, 56, 48);
    const lines = pdf.splitTextToSize(value, CONTENT_WIDTH - indent);
    const lineHeight = size * 0.46;
    for (const line of lines) {
      room(lineHeight);
      pdf.text(line, MARGIN + indent, y);
      y += lineHeight;
    }
  };
  const heading = (value: string) => {
    room(15); y += 5;
    pdf.setFillColor(228, 234, 218);
    pdf.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 8, 1.5, 1.5, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5); pdf.setTextColor(39, 76, 59);
    pdf.text(value.toUpperCase(), MARGIN + 4, y + 1.2);
    y += 9;
  };

  pdf.setFillColor(39, 76, 59);
  pdf.rect(0, 0, PAGE_WIDTH, 15, "F");
  pdf.setFont("times", "bold"); pdf.setFontSize(12); pdf.setTextColor(255, 251, 244);
  pdf.text("HOME COOKED", MARGIN, 9.5);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
  pdf.text("A recipe worth passing around", PAGE_WIDTH - MARGIN, 9.3, { align: "right" });
  y = 29;
  pdf.setTextColor(39, 76, 59);
  pdf.setFont("times", "bold"); pdf.setFontSize(27);
  const titleLines = pdf.splitTextToSize(recipe.title, CONTENT_WIDTH);
  for (const line of titleLines) { pdf.text(line, MARGIN, y); y += 10.5; }
  const meta = [
    recipe.prep_minutes ? `Prep ${formatDuration(recipe.prep_minutes)}` : null,
    recipe.cook_minutes ? `Cook ${formatDuration(recipe.cook_minutes)}` : null,
    recipe.prep_minutes || recipe.cook_minutes ? `Total ${formatDuration((recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0))}` : null,
    recipe.servings ? `Serves ${recipe.servings}` : null,
  ].filter(Boolean).join("   ·   ");
  if (meta || recipe.category?.name) {
    y += 2;
    pdf.setFillColor(247, 242, 231);
    pdf.roundedRect(MARGIN, y - 4.5, CONTENT_WIDTH, 12, 2, 2, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(82, 99, 76);
    pdf.text(recipe.category?.name?.toUpperCase() ?? "HOME COOKED RECIPE", MARGIN + 4, y + 0.5);
    if (meta) {
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(82, 83, 74);
      pdf.text(meta, MARGIN + 4, y + 5);
    }
    y += 13;
  }
  const story = recipe.story ?? recipe.stories?.[0]?.body;
  if (recipe.description) { heading("About this recipe"); text(recipe.description, 10); }
  if (story && story !== recipe.description) { heading("A note"); text(story, 10); }

  heading("Ingredients");
  let lastGroup: string | null = null;
  for (const ingredient of recipe.ingredients) {
    const group = ingredient.group_label?.trim() || null;
    if (group && group !== lastGroup) { text(group, 10, "bold"); lastGroup = group; }
    text([ingredient.quantity, ingredient.unit, ingredient.item, ingredient.note ? `(${ingredient.note})` : null].filter(Boolean).join(" "), 10, "normal", 4);
  }
  heading("Instructions");
  recipe.instructions.forEach((instruction, index) => {
    text(`${index + 1}. ${instruction.body}`, 10, "normal", 1);
    y += 2;
  });

  const count = pdf.getNumberOfPages();
  for (let index = 1; index <= count; index++) { pdf.setPage(index); footer(); }
  return new File([pdf.output("blob")], `${safeFilename(recipe.title)}-recipe.pdf`, { type: "application/pdf" });
}

export function downloadRecipePdf(file: File) {
  const href = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = href; anchor.download = file.name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
