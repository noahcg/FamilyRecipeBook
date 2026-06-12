"use client";

import { Fragment, useEffect, useMemo, useState, useRef, type RefObject } from "react";
import { useForm, useFieldArray, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, ChevronDown, ClipboardPaste, FileUp, Plus, Trash2, GripVertical, ImagePlus, WandSparkles, X } from "lucide-react";
import { clsx } from "clsx";
import { Button, Input, Textarea } from "@/components/ui";
import { improveRecipeImportWithOpenAI } from "@/lib/actions/recipeImageImport";
import { createRecipeSchema, type CreateRecipeInput } from "@/lib/validators/recipe";
import {
  createRecipe,
  createRecipesBatch,
  moveRecipeToBook,
  updateRecipe,
  type RecipeAssignmentOption,
} from "@/lib/actions/recipes";
import { uploadRecipeImage } from "@/lib/upload";
import {
  importRecipeWithLocalOcr,
  prepareRecipeImportImage,
  type ImportedRecipe,
} from "@/lib/imageImport";
import { selectRecipeImage } from "@/lib/actions/pexels";
import { generateRecipeDescription } from "@/lib/actions/recipeDescription";
import { formatDuration } from "@/lib/formatDuration";
import { parsePastedRecipe } from "@/lib/recipeTextImport";
import { importRecipeFiles, type NormalizedImportedRecipe } from "@/lib/recipeFileImport";
import { useUser } from "@/lib/hooks/useUser";
import type { BookCategory } from "@/lib/actions/categories";
import type { RecipeWithRelations } from "@/lib/types";

function getArrayErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  return null;
}

interface RecipeFormProps {
  bookId: string;
  categories: BookCategory[];
  bookOptions?: RecipeAssignmentOption[];
  recipe?: RecipeWithRelations;
  onSuccessRedirect?: string;
  hasOpenAIKey?: boolean;
  enablePasteEntry?: boolean;
}

type PasteDetails = {
  title?: string;
  prep_minutes?: number;
  cook_minutes?: number;
  servings?: number;
};

type IngredientKeypadField = "quantity" | "unit";

type IngredientKeypadTarget = {
  index: number;
  field: IngredientKeypadField;
};

const INGREDIENT_KEYPAD_UNITS = ["tsp", "Tbsp", "oz", "lb", "can", "cup"];
const entryGridClassName = "grid gap-8 lg:grid-cols-2 lg:gap-12";
const entryCardClassName = "rounded-xl border border-line bg-card p-5 shadow-xs";
// Manual editor sections: one centered column of distinct cards.
const sectionCardClassName = "rounded-xl border border-line bg-card p-5 shadow-xs sm:p-6";
const sectionHeadingClassName = "text-sm font-semibold text-ink mb-3";
const entryCardHeaderClassName = "flex items-start gap-3";
const entryCardIconClassName =
  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-pale text-green-deep";

function duplicateImportKeys(recipes: NormalizedImportedRecipe[]) {
  const counts = new Map<string, number>();
  for (const recipe of recipes) {
    const key = `${recipe.title.toLowerCase().trim()}|${recipe.source_url?.toLowerCase().trim() ?? ""}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function truncateImportValue(value: string | undefined, max: number) {
  if (!value) return undefined;
  return value.length > max ? value.slice(0, max).trim() : value;
}

function validImportUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function importedRecipeToInput(recipe: NormalizedImportedRecipe, photoUrl?: string): CreateRecipeInput {
  return {
    title: truncateImportValue(recipe.title, 200) ?? "Imported recipe",
    description: truncateImportValue(recipe.description, 500),
    photo_url: photoUrl ?? null,
    source_name: truncateImportValue(recipe.source_name, 100),
    story: truncateImportValue(recipe.story || recipe.notes, 2000),
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    servings: recipe.servings,
    category: truncateImportValue(recipe.category, 50),
    tags: recipe.tags.map((tag) => truncateImportValue(tag, 30)).filter((tag): tag is string => Boolean(tag)).slice(0, 10),
    import_method: "file_import",
    source_url: validImportUrl(recipe.source_url),
    import_source: truncateImportValue(recipe.import_source, 100),
    import_metadata: recipe.import_metadata,
    nutrition: recipe.nutrition,
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((ingredient) => ({
          quantity: truncateImportValue(ingredient.quantity, 20) ?? "",
          unit: truncateImportValue(ingredient.unit, 30) ?? "",
          item: truncateImportValue(ingredient.item, 200) ?? "Imported ingredient",
          note: truncateImportValue(ingredient.note, 200) ?? "",
          group_label: truncateImportValue(ingredient.group_label ?? undefined, 100) ?? null,
        }))
      : [{ quantity: "", unit: "", item: "Imported recipe", note: "", group_label: null }],
    instructions: recipe.instructions.length
      ? recipe.instructions.map((instruction) => ({
          body: truncateImportValue(instruction.body, 2000) ?? "Review imported instructions.",
        }))
      : [{ body: "Review imported instructions." }],
  };
}

function hasFieldValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}


function ingredientKeypadTargetKey(target: IngredientKeypadTarget | null) {
  return target ? `${target.index}-${target.field}` : "";
}

function IngredientKeypad({
  containerRef,
  target,
  onInsert,
  onInsertUnit,
  onBackspace,
  onNext,
  onManual,
  onClose,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  target: IngredientKeypadTarget;
  onInsert: (text: string) => void;
  onInsertUnit: (unit: string) => void;
  onBackspace: () => void;
  onNext: () => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const numberRows = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["0", "space", "/"],
  ];
  const unitRows = [
    INGREDIENT_KEYPAD_UNITS.slice(0, 2),
    INGREDIENT_KEYPAD_UNITS.slice(2, 4),
    INGREDIENT_KEYPAD_UNITS.slice(4, 6),
    ["Backspace", "Next"],
  ];
  const activeLabel = target.field === "quantity" ? "quantity" : "unit";

  return (
    <div ref={containerRef} className="absolute left-0 right-0 top-full z-40 mt-2 max-w-[25rem] rounded-md border border-line bg-card/95 p-2.5 shadow-[0_16px_38px_rgba(57,45,25,0.16)] backdrop-blur-xl sm:left-auto sm:right-7 sm:w-[24rem]">
      <div>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-accent-cinnamon">
              Ingredient {target.index + 1}
            </p>
            <p className="mt-0.5 text-xs font-bold text-ink-muted">
              Editing {activeLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onManual}
              className="rounded-sm border border-line bg-white-soft px-2.5 py-1.5 text-[11px] font-extrabold text-green-deep transition hover:bg-green-pale"
            >
              Manual
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close recipe keypad"
              className="grid size-7 place-items-center rounded-sm text-sm font-black text-ink-soft transition hover:bg-card-muted hover:text-ink"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {numberRows.flat().map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onInsert(key === "space" ? " " : key)}
                className="h-9 rounded-sm border border-line-soft bg-white-soft text-base font-bold text-ink shadow-xs transition hover:border-green-sage hover:bg-green-pale active:translate-y-px"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {unitRows.flat().map((key) => {
              const isCommand = key === "Backspace" || key === "Next";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === "Backspace") onBackspace();
                    else if (key === "Next") onNext();
                    else onInsertUnit(key);
                  }}
                  className={clsx(
                    "h-9 whitespace-nowrap rounded-sm border px-1 text-xs font-extrabold shadow-xs transition active:translate-y-px",
                    isCommand
                      ? "border-green-deep bg-green-deep text-[11px] text-ink-inverse hover:bg-green-forest-dark"
                      : "border-line-soft bg-paper-warm text-green-deep hover:border-green-sage hover:bg-green-pale"
                  )}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecipeForm({
  bookId,
  categories,
  bookOptions,
  recipe,
  onSuccessRedirect,
  hasOpenAIKey = false,
  enablePasteEntry = false,
}: RecipeFormProps) {
  const router = useRouter();
  const { userId } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const ingredientKeypadRef = useRef<HTMLDivElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(recipe?.photo_url ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importedRecipe, setImportedRecipe] = useState<ImportedRecipe | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [preparedImportImage, setPreparedImportImage] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImprovingImport, setIsImprovingImport] = useState(false);
  const [isImportDragging, setIsImportDragging] = useState(false);
  const [importSource, setImportSource] = useState<"local" | "openai" | null>(null);
  const [recipeImportedViaUpload, setRecipeImportedViaUpload] = useState(
    recipe?.import_method === "image_upload"
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!recipe;
  const showPasteEntry = enablePasteEntry && !isEdit;
  const [entryMode, setEntryMode] = useState<"manual" | "paste" | "import">("manual");
  const [pastedRecipe, setPastedRecipe] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSummary, setPasteSummary] = useState<string | null>(null);
  const [pasteDetails, setPasteDetails] = useState<PasteDetails>({});
  const fileImportRef = useRef<HTMLInputElement>(null);
  const [fileImportRecipes, setFileImportRecipes] = useState<NormalizedImportedRecipe[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [expandedImportId, setExpandedImportId] = useState<string | null>(null);
  const [fileImportWarnings, setFileImportWarnings] = useState<string[]>([]);
  const [skippedImportFiles, setSkippedImportFiles] = useState<{ fileName: string; reason: string }[]>([]);
  const [fileImportError, setFileImportError] = useState<string | null>(null);
  const [isFileParsing, setIsFileParsing] = useState(false);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [activeIngredientKeypad, setActiveIngredientKeypad] = useState<IngredientKeypadTarget | null>(null);
  const [manualIngredientKeypad, setManualIngredientKeypad] = useState<IngredientKeypadTarget | null>(null);
  const [draggingIngredientIndex, setDraggingIngredientIndex] = useState<number | null>(null);
  const [dragOverIngredientIndex, setDragOverIngredientIndex] = useState<number | null>(null);
  const assignmentOptions = useMemo<RecipeAssignmentOption[]>(
    () =>
      bookOptions?.length
        ? bookOptions
        : [{ id: bookId, title: "This cookbook", role: "keeper", categories }],
    [bookId, bookOptions, categories]
  );
  const initialBookId = assignmentOptions.some((book) => book.id === bookId)
    ? bookId
    : assignmentOptions[0]?.id ?? bookId;
  const [selectedBookId, setSelectedBookId] = useState(initialBookId);
  const resolvedSelectedBookId = assignmentOptions.some((book) => book.id === selectedBookId)
    ? selectedBookId
    : initialBookId;
  const activeBook = assignmentOptions.find((book) => book.id === resolvedSelectedBookId) ?? assignmentOptions[0];
  const activeCategories = activeBook?.categories.length ? activeBook.categories : categories;
  const showCookbookPicker = assignmentOptions.length > 1;

  const {
    register,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateRecipeInput>({
    resolver: zodResolver(createRecipeSchema) as Resolver<CreateRecipeInput>,
    defaultValues: recipe
      ? {
          title: recipe.title,
          description: recipe.description ?? "",
          photo_url: recipe.photo_url ?? "",
          source_name: recipe.source_name ?? "",
          story: recipe.story ?? "",
          prep_minutes: recipe.prep_minutes ?? undefined,
          cook_minutes: recipe.cook_minutes ?? undefined,
          servings: recipe.servings ?? undefined,
          category: recipe.category?.name ?? "",
          tags: recipe.tags ?? [],
          import_method: recipe.import_method,
          source_url: recipe.source_url ?? "",
          import_source: recipe.import_source ?? "",
          import_metadata: recipe.import_metadata ?? {},
          nutrition: recipe.nutrition ?? {},
          ingredients: recipe.ingredients?.length
            ? recipe.ingredients.map((i) => ({
                quantity: i.quantity ?? "",
                unit: i.unit ?? "",
                item: i.item,
                note: i.note ?? "",
                group_label: i.group_label ?? null,
              }))
            : [{ quantity: "", unit: "", item: "", note: "", group_label: null }],
          instructions: recipe.instructions?.length
            ? recipe.instructions.map((i) => ({ body: i.body }))
            : [{ body: "" }],
        }
      : {
          title: "",
          description: "",
          photo_url: "",
          source_name: "",
          story: "",
          tags: [],
          import_method: undefined,
          source_url: "",
          import_source: "",
          import_metadata: {},
          nutrition: {},
          ingredients: [{ quantity: "", unit: "", item: "", note: "", group_label: null }],
          instructions: [{ body: "" }],
        },
  });

  const {
    fields: ingredients,
    append: addIngredient,
    insert: insertIngredient,
    remove: removeIngredient,
    move: moveIngredient,
    replace: replaceIngredients,
  } = useFieldArray({ control, name: "ingredients" });

  const {
    fields: instructions,
    append: addInstruction,
    remove: removeInstruction,
    replace: replaceInstructions,
  } = useFieldArray({ control, name: "instructions" });

  const selectedCategory = useWatch({ control, name: "category" });
  const watchedIngredients = useWatch({ control, name: "ingredients" });

  // Ingredient headings are derived from each ingredient's group_label: a
  // contiguous run sharing a label sits under one heading. Editing a heading
  // rewrites that whole run.
  function setIngredientHeadingRun(startIndex: number, nextLabel: string | null) {
    const list = getValues("ingredients") ?? [];
    const previousLabel = list[startIndex]?.group_label ?? null;
    for (let index = startIndex; index < list.length; index += 1) {
      if ((list[index]?.group_label ?? null) !== previousLabel) break;
      setValue(`ingredients.${index}.group_label`, nextLabel, { shouldDirty: true });
    }
  }

  function addIngredientHeading() {
    setActiveIngredientKeypad(null);
    setManualIngredientKeypad(null);
    const newIndex = getValues("ingredients")?.length ?? 0;
    addIngredient({ quantity: "", unit: "", item: "", note: "", group_label: "" });
    window.setTimeout(() => {
      document.getElementById(`ingredient-heading-${newIndex}`)?.focus();
    }, 0);
  }

  // Add an ingredient to a specific section: insert right after the section's
  // last row, carrying that section's heading so it joins the right group.
  function addIngredientToSection(afterIndex: number, label: string | null) {
    setActiveIngredientKeypad(null);
    setManualIngredientKeypad(null);
    insertIngredient(afterIndex + 1, { quantity: "", unit: "", item: "", note: "", group_label: label });
    window.setTimeout(() => {
      document.getElementById(`ingredient-${afterIndex + 1}-item`)?.focus();
    }, 0);
  }

  // Drag-to-reorder: the GripVertical handle starts the drag. On drop we move the
  // row to its new index and have it adopt the section (group_label) it lands in,
  // so heading runs stay contiguous.
  function handleIngredientDragStart(index: number) {
    setActiveIngredientKeypad(null);
    setManualIngredientKeypad(null);
    setDraggingIngredientIndex(index);
  }

  function handleIngredientDragEnter(index: number) {
    if (draggingIngredientIndex === null || draggingIngredientIndex === index) return;
    setDragOverIngredientIndex(index);
  }

  function handleIngredientDrop(targetIndex: number) {
    const from = draggingIngredientIndex;
    setDraggingIngredientIndex(null);
    setDragOverIngredientIndex(null);
    if (from === null || from === targetIndex) return;
    moveIngredient(from, targetIndex);
    // After the move the row sits at targetIndex; join the section above it.
    const adoptedLabel =
      targetIndex === 0 ? null : getValues(`ingredients.${targetIndex - 1}.group_label`) ?? null;
    setValue(`ingredients.${targetIndex}.group_label`, adoptedLabel, { shouldDirty: true });
  }

  function handleIngredientDragEnd() {
    setDraggingIngredientIndex(null);
    setDragOverIngredientIndex(null);
  }

  useEffect(() => {
    if (!resolvedSelectedBookId || activeCategories.length === 0) return;
    const currentCategory = getValues("category");
    if (currentCategory && activeCategories.some((category) => category.name === currentCategory)) return;
    setValue("category", activeCategories.find((category) => category.is_default)?.name ?? activeCategories[0]?.name ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [activeCategories, getValues, resolvedSelectedBookId, setValue]);

  useEffect(() => {
    if (!activeIngredientKeypad) return;
    const keypadTarget = activeIngredientKeypad;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const keypadElement = ingredientKeypadRef.current;
      const activeFieldElement = document.getElementById(
        `ingredient-${keypadTarget.index}-${keypadTarget.field}`
      );

      if (keypadElement?.contains(target) || activeFieldElement?.contains(target)) return;

      setActiveIngredientKeypad(null);
      setManualIngredientKeypad(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [activeIngredientKeypad]);

  function focusIngredientField(index: number, field: IngredientKeypadField | "item") {
    window.setTimeout(() => {
      document.getElementById(`ingredient-${index}-${field}`)?.focus();
    }, 0);
  }

  function activateIngredientKeypad(index: number, field: IngredientKeypadField) {
    const target = { index, field };
    setActiveIngredientKeypad(target);
    setManualIngredientKeypad((current) =>
      ingredientKeypadTargetKey(current) === ingredientKeypadTargetKey(target) ? current : null
    );
  }

  function ingredientKeypadFieldName(target: IngredientKeypadTarget) {
    return `ingredients.${target.index}.${target.field}` as `ingredients.${number}.${IngredientKeypadField}`;
  }

  function updateIngredientKeypadValue(target: IngredientKeypadTarget, value: string) {
    setValue(ingredientKeypadFieldName(target), value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleIngredientKeypadInsert(text: string) {
    if (!activeIngredientKeypad) return;
    const fieldName = ingredientKeypadFieldName(activeIngredientKeypad);
    const currentValue = String(getValues(fieldName) ?? "");
    const nextValue = text === " " && (!currentValue || currentValue.endsWith(" "))
      ? currentValue
      : `${currentValue}${text}`;
    updateIngredientKeypadValue(activeIngredientKeypad, nextValue);
    focusIngredientField(activeIngredientKeypad.index, activeIngredientKeypad.field);
  }

  function handleIngredientKeypadUnit(unit: string) {
    if (!activeIngredientKeypad) return;
    updateIngredientKeypadValue({ index: activeIngredientKeypad.index, field: "unit" }, unit);

    if (activeIngredientKeypad.field === "quantity") {
      setActiveIngredientKeypad(null);
      setManualIngredientKeypad(null);
      focusIngredientField(activeIngredientKeypad.index, "item");
      return;
    }

    focusIngredientField(activeIngredientKeypad.index, "unit");
  }

  function handleIngredientKeypadBackspace() {
    if (!activeIngredientKeypad) return;
    const fieldName = ingredientKeypadFieldName(activeIngredientKeypad);
    const currentValue = String(getValues(fieldName) ?? "");
    updateIngredientKeypadValue(activeIngredientKeypad, currentValue.slice(0, -1));
    focusIngredientField(activeIngredientKeypad.index, activeIngredientKeypad.field);
  }

  function handleIngredientKeypadNext() {
    if (!activeIngredientKeypad) return;

    if (activeIngredientKeypad.field === "quantity") {
      const nextTarget = { index: activeIngredientKeypad.index, field: "unit" as const };
      setActiveIngredientKeypad(nextTarget);
      setManualIngredientKeypad(null);
      focusIngredientField(activeIngredientKeypad.index, "unit");
      return;
    }

    setActiveIngredientKeypad(null);
    setManualIngredientKeypad(null);
    focusIngredientField(activeIngredientKeypad.index, "item");
  }

  function enableManualIngredientKeypad() {
    if (!activeIngredientKeypad) return;
    setManualIngredientKeypad(activeIngredientKeypad);
    focusIngredientField(activeIngredientKeypad.index, activeIngredientKeypad.field);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setValue("photo_url", "", { shouldDirty: true });
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handlePhotoUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    setPhotoFile(null);
    setPhotoPreview(value || null);
  }

  async function importRecipePhoto(file: File) {
    if (!file) return;

    setImportFileName(file.name);
    setImportedRecipe(null);
    setImportError(null);
    setPreparedImportImage(null);
    setImportSource(null);
    setImportProgress(0);
    setImportStatus("Preparing photo");
    setIsImporting(true);

    try {
      const imageDataUrl = await prepareRecipeImportImage(file);
      setPreparedImportImage(imageDataUrl);
      const result = await importRecipeWithLocalOcr(imageDataUrl, (progress) => {
        setImportStatus(progress.status);
        setImportProgress(progress.progress);
      });
      setImportedRecipe(result);
      setImportSource("local");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import that recipe photo.");
    } finally {
      setIsImporting(false);
      setImportStatus(null);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  async function handleImportImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await importRecipePhoto(file);
  }

  async function handleImportDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsImportDragging(false);
    if (isImporting) return;

    const file = Array.from(e.dataTransfer.files).find((candidate) =>
      candidate.type.startsWith("image/")
    );
    if (!file) {
      setImportError("Drop a JPEG, PNG, or WebP image of the recipe.");
      return;
    }

    await importRecipePhoto(file);
  }

  async function handleImproveImport() {
    if (!preparedImportImage || isImprovingImport) return;

    setIsImprovingImport(true);
    setImportError(null);

    const result = await improveRecipeImportWithOpenAI(bookId, preparedImportImage);
    setIsImprovingImport(false);

    if (!result.success) {
      setImportError(result.error);
      return;
    }

    setImportedRecipe(result.data);
    setImportSource("openai");
  }

  function formHasContent() {
    const values = getValues();
    return Boolean(
      values.title?.trim() ||
        values.description?.trim() ||
        values.source_name?.trim() ||
        values.story?.trim() ||
        values.category?.trim() ||
        values.prep_minutes ||
        values.cook_minutes ||
        values.servings ||
        values.ingredients?.some((ingredient) =>
          [ingredient.quantity, ingredient.unit, ingredient.item, ingredient.note].some((value) =>
            value?.trim()
          )
        ) ||
        values.instructions?.some((instruction) => instruction.body?.trim())
    );
  }

  function applyImportedRecipe() {
    if (!importedRecipe) return;

    if (
      formHasContent() &&
      !window.confirm("Replace the current recipe fields with the imported text?")
    ) {
      return;
    }

    setValue("title", importedRecipe.title, { shouldDirty: true, shouldValidate: true });
    setValue("description", importedRecipe.description, { shouldDirty: true });
    setValue("source_name", importedRecipe.source_name, { shouldDirty: true });
    setValue("story", importedRecipe.story, { shouldDirty: true });
    setValue("prep_minutes", importedRecipe.prep_minutes || undefined, { shouldDirty: true });
    setValue("cook_minutes", importedRecipe.cook_minutes || undefined, { shouldDirty: true });
    setValue("servings", importedRecipe.servings || undefined, { shouldDirty: true });
    setValue("category", importedRecipe.category, { shouldDirty: true });
    setValue("tags", importedRecipe.tags, { shouldDirty: true });
    replaceIngredients(importedRecipe.ingredients);
    replaceInstructions(importedRecipe.instructions);
    setRecipeImportedViaUpload(true);
  }

  function handleParsePastedRecipe() {
    const parsedRecipe = parsePastedRecipe(pastedRecipe);

    setPasteError(null);
    setPasteSummary(null);
    setPasteDetails({});

    if (
      parsedRecipe.confidence === "low" ||
      !parsedRecipe.ingredients.length ||
      !parsedRecipe.instructions.length
    ) {
      setPasteError(
        "We could not confidently separate ingredients from steps. Add Ingredients and Instructions headings and try again."
      );
      return;
    }

    const currentValues = getValues();
    if (parsedRecipe.title && !currentValues.title?.trim()) {
      setValue("title", parsedRecipe.title, { shouldDirty: true, shouldValidate: true });
    }
    if (parsedRecipe.prep_minutes && !hasFieldValue(currentValues.prep_minutes)) {
      setValue("prep_minutes", parsedRecipe.prep_minutes, { shouldDirty: true, shouldValidate: true });
    }
    if (parsedRecipe.cook_minutes && !hasFieldValue(currentValues.cook_minutes)) {
      setValue("cook_minutes", parsedRecipe.cook_minutes, { shouldDirty: true, shouldValidate: true });
    }
    if (parsedRecipe.servings && !hasFieldValue(currentValues.servings)) {
      setValue("servings", parsedRecipe.servings, { shouldDirty: true, shouldValidate: true });
    }

    replaceIngredients(parsedRecipe.ingredients);
    replaceInstructions(parsedRecipe.instructions);
    setRecipeImportedViaUpload(false);
    const parsedDetails = {
      title: parsedRecipe.title,
      prep_minutes: parsedRecipe.prep_minutes,
      cook_minutes: parsedRecipe.cook_minutes,
      servings: parsedRecipe.servings,
    };
    const hasParsedDetails = Object.values(parsedDetails).some(Boolean);
    setPasteDetails(parsedDetails);
    setPasteSummary(
      hasParsedDetails
        ? `Parsed recipe details, ${parsedRecipe.ingredients.length} ingredient${parsedRecipe.ingredients.length === 1 ? "" : "s"}, and ${parsedRecipe.instructions.length} step${parsedRecipe.instructions.length === 1 ? "" : "s"}.`
        : `Parsed ${parsedRecipe.ingredients.length} ingredient${parsedRecipe.ingredients.length === 1 ? "" : "s"} and ${parsedRecipe.instructions.length} step${parsedRecipe.instructions.length === 1 ? "" : "s"}.`
    );
  }

  async function parseRecipeFiles(files: File[]) {
    if (!files.length) return;
    setFileImportError(null);
    setIsFileParsing(true);

    try {
      const result = await importRecipeFiles(files);
      setFileImportRecipes(result.recipes);
      setSelectedImportIds(new Set(result.recipes.map((recipe) => recipe.id)));
      setSkippedImportFiles(result.skippedFiles);
      setFileImportWarnings(result.warnings);
      setExpandedImportId(result.recipes[0]?.id ?? null);
      if (!result.recipes.length) {
        setFileImportError("No recipes were found in those files.");
      }
    } catch (error) {
      setFileImportError(error instanceof Error ? error.message : "Could not import those files.");
    } finally {
      setIsFileParsing(false);
      if (fileImportRef.current) fileImportRef.current.value = "";
    }
  }

  async function handleSaveImportedRecipes() {
    const selectedRecipes = fileImportRecipes.filter((recipe) => selectedImportIds.has(recipe.id));
    if (!selectedRecipes.length) {
      setFileImportError("Select at least one recipe to save.");
      return;
    }

    setFileImportError(null);
    setIsSavingImport(true);

    const payload: CreateRecipeInput[] = [];
    for (const recipe of selectedRecipes) {
      let photoUrl: string | undefined;
      if (recipe.image && userId) {
        const uploaded = await uploadRecipeImage(recipe.image.file, userId);
        if ("error" in uploaded) {
          setFileImportError(`${recipe.title}: ${uploaded.error}`);
          setIsSavingImport(false);
          return;
        }
        photoUrl = uploaded.url;
      }
      payload.push(importedRecipeToInput(recipe, photoUrl));
    }

    const targetBookId = resolvedSelectedBookId || bookId;
    const result = await createRecipesBatch(targetBookId, payload);
    setIsSavingImport(false);

    if (!result.success) {
      setFileImportError(result.error);
      return;
    }

    const firstId = result.data.ids[0];
    router.push(
      result.data.ids.length === 1
        ? `/app/books/${targetBookId}/recipes/${firstId}`
        : `/app/books/${targetBookId}/recipes`
    );
  }

  async function onSubmit(data: CreateRecipeInput) {
    setServerError(null);

    let photoUrl = data.photo_url ?? null;

    if (photoFile && userId) {
      const uploaded = await uploadRecipeImage(photoFile, userId);
      if ("error" in uploaded) {
        setServerError(uploaded.error);
        return;
      }
      photoUrl = uploaded.url;
    }

    // Auto-fill from AI so the recipe page never renders empty placeholder
    // areas. The photo is only picked for new recipes, but a missing
    // description is filled on every save — including existing recipes — so
    // older recipes can be backfilled just by opening Edit and saving.
    let description = data.description;
    const ingredientNames = data.ingredients.map((i) => i.item).filter(Boolean);

    if (!photoUrl && !isEdit) {
      const auto = await selectRecipeImage(data.title, ingredientNames);
      if (auto) photoUrl = auto;
    }

    if (!description?.trim()) {
      const generated = await generateRecipeDescription(data.title, ingredientNames);
      if (generated) description = generated;
    }

    const payload = {
      ...data,
      description,
      photo_url: photoUrl,
      import_method: recipeImportedViaUpload ? "image_upload" : data.import_method,
    } satisfies CreateRecipeInput;

    const targetBookId = resolvedSelectedBookId || bookId;

    if (isEdit && recipe) {
      if (targetBookId !== bookId) {
        const moveResult = await moveRecipeToBook(bookId, recipe.id, targetBookId);
        if (!moveResult.success) {
          setServerError(moveResult.error);
          return;
        }
      }

      const result = await updateRecipe(targetBookId, recipe.id, payload);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push(
        onSuccessRedirect ?? `/app/books/${targetBookId}/recipes/${recipe.id}`
      );
    } else {
      const result = await createRecipe(targetBookId, payload as CreateRecipeInput);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push(
        onSuccessRedirect ?? `/app/books/${targetBookId}/recipes/${result.data.id}`
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-10">
      {/* Manual mode shows this inside the right column; paste/import keep it up top. */}
      {showCookbookPicker && showPasteEntry && entryMode !== "manual" && (
        <div className="mb-6 rounded-xl border border-line-soft bg-card p-4 shadow-xs">
          <label htmlFor="recipe-book" className="block text-sm font-bold text-ink">
            Cookbook
          </label>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Choose where this recipe should live.
          </p>
          <select
            id="recipe-book"
            value={resolvedSelectedBookId}
            onChange={(event) => setSelectedBookId(event.target.value)}
            className="input-cookbook mt-3 h-12 w-full text-sm"
          >
            {assignmentOptions.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {showPasteEntry && (
        <div className="mb-6 inline-flex rounded-full border border-line bg-paper-soft p-1 shadow-xs">
          {[
            ["manual", "Manual entry"],
            ["paste", "Copy/paste"],
            ["import", "Import"],
          ].map(([mode, label]) => {
            const selected = entryMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setEntryMode(mode as "manual" | "paste" | "import")}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-extrabold transition-colors",
                  selected
                    ? "bg-green-deep text-ink-inverse shadow-xs"
                    : "text-green-deep hover:bg-green-pale"
                )}
                aria-pressed={selected}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {(!showPasteEntry || entryMode === "manual") ? (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">

        {/* ── Right column (40%): photo + details ── */}
        <div className="space-y-6 lg:order-2">

        {/* ── Save to cookbook ── */}
        {showCookbookPicker && (
          <section className={sectionCardClassName}>
            <label htmlFor="recipe-book" className={clsx(sectionHeadingClassName, "block")}>
              Save to cookbook
            </label>
            <select
              id="recipe-book"
              value={resolvedSelectedBookId}
              onChange={(event) => setSelectedBookId(event.target.value)}
              className="input-cookbook h-11 w-full text-sm"
            >
              {assignmentOptions.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* ── Photo ── */}
        <section className={sectionCardClassName}>
          <p className={sectionHeadingClassName}>Photo</p>
          {/* Photo upload */}
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={clsx(
                "w-full rounded-xl border-2 border-dashed",
                "flex flex-col items-center justify-center gap-2",
                "transition-colors hover:border-green-sage",
                photoPreview
                  ? "border-transparent p-0 overflow-hidden"
                  : "border-line text-ink-soft",
                "aspect-[4/3] sm:aspect-[3/2] sm:max-w-sm"
              )}
              style={{ background: photoPreview ? undefined : "var(--color-paper-warm)" }}
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Recipe photo preview"
                  className="recipe-image w-full h-full"
                />
              ) : (
                <>
                  <ImagePlus size={28} strokeWidth={1.5} />
                  <span className="text-sm font-medium">Add a photo</span>
                  <span className="text-xs opacity-60">JPEG, PNG, or WebP · max 8 MB</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="sr-only"
            />
            {photoPreview && (
              <button
                type="button"
                onClick={() => {
                  setPhotoPreview(null);
                  setPhotoFile(null);
                  setValue("photo_url", "", { shouldDirty: true });
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-xs text-ink-soft underline mt-1"
              >
                Remove photo
              </button>
            )}
            <div className="mt-3">
              <Input
                label="Photo URL"
                type="url"
                placeholder="https://images.pexels.com/photos/..."
                hint="Paste an image URL to replace the current photo."
                error={errors.photo_url?.message}
                {...register("photo_url", {
                  onChange: handlePhotoUrlChange,
                })}
              />
            </div>
          </div>
        </section>

        {/* ── Details ── */}
        <section className={sectionCardClassName}>
          {/* Timing + servings + category */}
          <div>
            <p className="text-sm font-semibold text-ink mb-3">Details</p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Prep (min)"
                type="number"
                min={0}
                placeholder="15"
                error={errors.prep_minutes?.message}
                {...register("prep_minutes")}
              />
              <Input
                label="Cook (min)"
                type="number"
                min={0}
                placeholder="45"
                error={errors.cook_minutes?.message}
                {...register("cook_minutes")}
              />
              <Input
                label="Servings"
                type="number"
                min={1}
                placeholder="4"
                error={errors.servings?.message}
                {...register("servings")}
              />
            </div>
            <div className="mt-4">
              <label className="text-sm font-semibold text-ink block mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {activeCategories.map((cat) => {
                  const selected = selectedCategory === cat.name;
                  return (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value={cat.name}
                        className="sr-only"
                        {...register("category")}
                      />
                      <span
                        className="px-3 py-1 rounded-pill text-sm font-semibold border transition-colors cursor-pointer"
                        style={
                          selected
                            ? {
                                background: "var(--color-sage-pale)",
                                borderColor: "var(--color-deep-green)",
                                color: "var(--color-deep-green)",
                              }
                            : {
                                background: "var(--color-paper-soft)",
                                borderColor: "var(--color-border)",
                                color: "var(--color-ink-muted)",
                              }
                        }
                      >
                        {cat.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        </div>

        {/* ── Left column (60%): about + ingredients + steps ── */}
        <div className="space-y-6 lg:order-1">

        {/* ── About ── */}
        <section className={sectionCardClassName}>
          <p className={sectionHeadingClassName}>About this recipe</p>
          {/* Core fields */}
          <div className="space-y-4">
            <Input
              label="Recipe title"
              required
              placeholder="e.g. Grandma's Apple Pie"
              error={errors.title?.message}
              {...register("title")}
            />
            <Input
              label="Who is this from?"
              placeholder="e.g. Grandma Rose"
              hint="The person this recipe is known for."
              error={errors.source_name?.message}
              {...register("source_name")}
            />
            <Textarea
              label="The story behind this recipe"
              placeholder="Add a note or memory…"
              hint="This will appear near the top of the recipe page."
              error={errors.story?.message}
              {...register("story")}
            />
            <Textarea
              label="Short description (optional)"
              placeholder="A short paragraph about the dish"
              hint="Left blank? We'll write a short description for you when you save."
              error={errors.description?.message}
              {...register("description")}
            />
          </div>
        </section>

        {/* ── Ingredients ── */}
        <section className={sectionCardClassName}>
          {/* Ingredients */}
          <div>
            <p className="text-sm font-semibold text-ink mb-3">
              Ingredients{" "}
              <span className="ml-2 rounded-sm bg-card-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-accent-cinnamon">
                At least one required
              </span>
              {errors.ingredients && (
                <span className="text-danger font-normal ml-1">
                  {getArrayErrorMessage(errors.ingredients) ?? "Fix errors below"}
                </span>
              )}
            </p>
            <div className="space-y-2">
              {ingredients.map((field, index) => {
                const headingLabel = watchedIngredients?.[index]?.group_label ?? null;
                const previousHeadingLabel =
                  index > 0 ? watchedIngredients?.[index - 1]?.group_label ?? null : null;
                const nextHeadingLabel =
                  index < ingredients.length - 1
                    ? watchedIngredients?.[index + 1]?.group_label ?? null
                    : null;
                const startsHeading =
                  headingLabel != null && (index === 0 || previousHeadingLabel !== headingLabel);
                const isLastInSection =
                  index === ingredients.length - 1 || nextHeadingLabel !== headingLabel;

                return (
                <Fragment key={field.id}>
                {startsHeading && (
                  <div className="flex items-center gap-2 pt-3">
                    <input
                      id={`ingredient-heading-${index}`}
                      value={headingLabel ?? ""}
                      onChange={(event) => setIngredientHeadingRun(index, event.target.value)}
                      placeholder="Ingredient heading, e.g. For the sauce"
                      aria-label={`Ingredient heading for the section starting at ingredient ${index + 1}`}
                      className="input-cookbook h-9 flex-1 text-sm font-bold text-green-deep"
                    />
                    <button
                      type="button"
                      onClick={() => setIngredientHeadingRun(index, null)}
                      className="text-ink-soft transition-colors hover:text-danger"
                      aria-label="Remove ingredient heading"
                    >
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>
                )}
                <div
                  data-ingredient-row
                  className={clsx(
                    "relative flex gap-2 items-start rounded-md transition-colors",
                    draggingIngredientIndex === index && "opacity-50",
                    dragOverIngredientIndex === index &&
                      draggingIngredientIndex !== index &&
                      "ring-2 ring-green-sage ring-offset-2 ring-offset-card"
                  )}
                  onDragOver={(event) => {
                    if (draggingIngredientIndex === null) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={() => handleIngredientDragEnter(index)}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleIngredientDrop(index);
                  }}
                >
                  <span
                    draggable
                    aria-hidden="true"
                    title="Drag to reorder"
                    className="mt-2.5 -ml-1 inline-flex shrink-0 cursor-grab touch-none rounded p-1 text-ink-soft opacity-40 transition-opacity hover:opacity-70 active:cursor-grabbing"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      const row = event.currentTarget.closest("[data-ingredient-row]");
                      if (row instanceof HTMLElement) {
                        event.dataTransfer.setDragImage(row, 12, 12);
                      }
                      handleIngredientDragStart(index);
                    }}
                    onDragEnd={handleIngredientDragEnd}
                  >
                    <GripVertical size={16} />
                  </span>
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-[5rem_7rem_1fr]">
                    <input
                      id={`ingredient-${index}-quantity`}
                      className={clsx(
                        "input-cookbook text-sm",
                        ingredientKeypadTargetKey(activeIngredientKeypad) === `${index}-quantity` && "border-green-sage bg-card"
                      )}
                      placeholder="Qty"
                      inputMode={ingredientKeypadTargetKey(manualIngredientKeypad) === `${index}-quantity` ? "text" : "none"}
                      readOnly={ingredientKeypadTargetKey(manualIngredientKeypad) !== `${index}-quantity`}
                      onFocus={() => activateIngredientKeypad(index, "quantity")}
                      {...register(`ingredients.${index}.quantity`)}
                    />
                    <input
                      id={`ingredient-${index}-unit`}
                      className={clsx(
                        "input-cookbook text-sm",
                        ingredientKeypadTargetKey(activeIngredientKeypad) === `${index}-unit` && "border-green-sage bg-card"
                      )}
                      placeholder="Unit"
                      inputMode={ingredientKeypadTargetKey(manualIngredientKeypad) === `${index}-unit` ? "text" : "none"}
                      readOnly={ingredientKeypadTargetKey(manualIngredientKeypad) !== `${index}-unit`}
                      onFocus={() => activateIngredientKeypad(index, "unit")}
                      {...register(`ingredients.${index}.unit`)}
                    />
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <input
                        id={`ingredient-${index}-item`}
                        className="input-cookbook text-sm w-full"
                        placeholder="Ingredient"
                        required
                        aria-label={`Ingredient ${index + 1} name, required`}
                        onFocus={() => {
                          setActiveIngredientKeypad(null);
                          setManualIngredientKeypad(null);
                        }}
                        {...register(`ingredients.${index}.item`)}
                      />
                      {errors.ingredients?.[index]?.item && (
                        <p className="text-xs text-danger mt-0.5">
                          {errors.ingredients[index]?.item?.message}
                        </p>
                      )}
                    </div>
                  </div>
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveIngredientKeypad(null);
                        setManualIngredientKeypad(null);
                        removeIngredient(index);
                      }}
                      className="mt-3 text-ink-soft hover:text-danger transition-colors"
                      aria-label="Remove ingredient"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  )}
                  {activeIngredientKeypad?.index === index && (
                    <IngredientKeypad
                      containerRef={ingredientKeypadRef}
                      target={activeIngredientKeypad}
                      onInsert={handleIngredientKeypadInsert}
                      onInsertUnit={handleIngredientKeypadUnit}
                      onBackspace={handleIngredientKeypadBackspace}
                      onNext={handleIngredientKeypadNext}
                      onManual={enableManualIngredientKeypad}
                      onClose={() => {
                        setActiveIngredientKeypad(null);
                        setManualIngredientKeypad(null);
                      }}
                    />
                  )}
                </div>
                {isLastInSection && (
                  <button
                    type="button"
                    onClick={() => addIngredientToSection(index, headingLabel)}
                    className="ml-6 flex items-center gap-1.5 text-sm font-semibold text-green-deep hover:underline"
                  >
                    <Plus size={14} /> Add ingredient
                  </button>
                )}
                </Fragment>
                );
              })}
            </div>
            <div className="mt-3 border-t border-line-soft pt-3">
              <button
                type="button"
                onClick={addIngredientHeading}
                className="flex items-center gap-1.5 text-sm font-semibold text-green-deep hover:underline"
              >
                <Plus size={14} /> Add ingredient heading
              </button>
            </div>
          </div>
        </section>

        {/* ── Steps ── */}
        <section className={sectionCardClassName}>
          {/* Instructions */}
          <div>
            <p className="text-sm font-semibold text-ink mb-3">
              Steps{" "}
              <span className="ml-2 rounded-sm bg-card-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-accent-cinnamon">
                At least one required
              </span>
              {errors.instructions && (
                <span className="text-danger font-normal ml-1">
                  {getArrayErrorMessage(errors.instructions) ?? "Fix errors below"}
                </span>
              )}
            </p>
            <div className="space-y-3">
              {instructions.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-ink-inverse shrink-0 mt-2.5"
                    style={{ background: "var(--color-deep-green)" }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <textarea
                      className="input-cookbook w-full text-sm min-h-16 resize-none"
                      placeholder={`Step ${index + 1}`}
                      required
                      aria-label={`Step ${index + 1}, required`}
                      rows={2}
                      {...register(`instructions.${index}.body`)}
                    />
                    {errors.instructions?.[index]?.body && (
                      <p className="text-xs text-danger mt-0.5">
                        {errors.instructions[index]?.body?.message}
                      </p>
                    )}
                  </div>
                  {instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="mt-3 text-ink-soft hover:text-danger transition-colors"
                      aria-label="Remove step"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addInstruction({ body: "" })}
              className="mt-2 flex items-center gap-1.5 text-sm text-green-deep font-semibold hover:underline"
            >
              <Plus size={14} /> Add step
            </button>
          </div>
        </section>

        {serverError && (
          <p className="text-sm text-danger font-medium">{serverError}</p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} className="flex-1">
            {isEdit ? "Save changes" : "Add to this book"}
          </Button>
        </div>
        </div>
        </div>
      </div>
      ) : entryMode === "paste" ? (
        <div className={entryGridClassName}>
          <div className="space-y-6 lg:order-2">
            <section className={entryCardClassName}>
              <div className={entryCardHeaderClassName}>
                <span className={entryCardIconClassName}>
                  <ClipboardPaste size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Copy/paste a recipe</p>
                  <p className="mt-1 text-sm leading-5 text-ink-soft">
                    Paste the whole recipe into one field. We&apos;ll pull out the
                    title, times, servings, ingredients, and steps automatically — you
                    just pick a category.
                  </p>
                </div>
              </div>

              <ol className="mt-5 space-y-2.5 text-sm text-ink-muted">
                <li className="flex gap-2">
                  <span className="font-bold text-green-deep">1.</span>
                  <span>Paste the full recipe — title and all — on the left.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-green-deep">2.</span>
                  <span>Choose a category below.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-green-deep">3.</span>
                  <span>Parse, give it a quick review, and save.</span>
                </li>
              </ol>
            </section>

            <section className="rounded-xl border border-line bg-card p-5 shadow-xs">
              <p className="text-sm font-semibold text-ink mb-1">
                Category{" "}
                <span className="ml-1 rounded-sm bg-card-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-accent-cinnamon">
                  Required
                </span>
              </p>
              <p className="mb-3 text-xs text-ink-muted">
                Pick where this recipe belongs in your book.
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const selected = selectedCategory === cat.name;
                  return (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value={cat.name}
                        className="sr-only"
                        {...register("category")}
                      />
                      <span
                        className="px-3 py-1 rounded-pill text-sm font-semibold border transition-colors cursor-pointer"
                        style={
                          selected
                            ? {
                                background: "var(--color-sage-pale)",
                                borderColor: "var(--color-deep-green)",
                                color: "var(--color-deep-green)",
                              }
                            : {
                                background: "var(--color-paper-soft)",
                                borderColor: "var(--color-border)",
                                color: "var(--color-ink-muted)",
                              }
                        }
                      >
                        {cat.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-5 lg:order-1">
            <Textarea
              label="Paste recipe"
              placeholder={"Grandma's Apple Pie\n\nPrep: 20 min\nCook: 45 min\nServes: 8\n\nIngredients\n6 cups sliced apples\n3/4 cup sugar\n1 tsp cinnamon\n\nInstructions\n1. Preheat oven to 375°F.\n2. Toss apples with sugar and cinnamon.\n3. Bake until golden."}
              hint="Start with the title, then prep/cook times and servings (e.g. “Prep: 20 min”, “Serves: 8”), followed by the ingredients and steps. Ingredients and Instructions headings give the best results."
              value={pastedRecipe}
              onChange={(event) => {
                setPastedRecipe(event.target.value);
                setPasteSummary(null);
                setPasteError(null);
                setPasteDetails({});
              }}
              className="min-h-[28rem]"
            />

            {pasteError && (
              <div className="flex gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" strokeWidth={1.8} />
                <p>{pasteError}</p>
              </div>
            )}

            {pasteSummary && (
              <div className="rounded-lg border border-green-sage/30 bg-green-pale/70 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-green-deep" strokeWidth={1.8} />
                  <div>
                    <p className="text-sm font-bold text-green-deep">{pasteSummary}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      Confirm the title, then save. You can fine-tune everything later in Manual entry.
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-green-sage/25 bg-white-soft/70 p-3">
                  <Input
                    label="Recipe title"
                    required
                    placeholder="e.g. Grandma's Apple Pie"
                    hint="We pulled this from your paste — edit it if needed."
                    error={errors.title?.message}
                    {...register("title")}
                  />
                </div>
                {Boolean(pasteDetails.prep_minutes || pasteDetails.cook_minutes || pasteDetails.servings) && (
                  <div className="mt-3 rounded-md border border-green-sage/25 bg-white-soft/60 p-3">
                    <p className="mb-2 text-xs font-bold text-ink">Details</p>
                    <div className="grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
                      {pasteDetails.prep_minutes && (
                        <p>
                          <span className="font-bold text-ink">Prep:</span> {formatDuration(pasteDetails.prep_minutes)}
                        </p>
                      )}
                      {pasteDetails.cook_minutes && (
                        <p>
                          <span className="font-bold text-ink">Cook:</span> {formatDuration(pasteDetails.cook_minutes)}
                        </p>
                      )}
                      {pasteDetails.servings && (
                        <p>
                          <span className="font-bold text-ink">Servings:</span> {pasteDetails.servings}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-3 grid gap-3 text-xs text-ink-muted sm:grid-cols-2">
                  <div>
                    <p className="mb-1 font-bold text-ink">Ingredients</p>
                    <ul className="space-y-1">
                      {getValues("ingredients").slice(0, 4).map((ingredient, index) => (
                        <li key={`${ingredient.item}-${index}`} className="truncate">
                          {[ingredient.quantity, ingredient.unit, ingredient.item].filter(Boolean).join(" ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-ink">Steps</p>
                    <ul className="space-y-1">
                      {getValues("instructions").slice(0, 3).map((instruction, index) => (
                        <li key={`${instruction.body}-${index}`} className="line-clamp-1">
                          {index + 1}. {instruction.body}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {errors.ingredients && (
              <p className="text-sm text-danger">
                Ingredients: {getArrayErrorMessage(errors.ingredients) ?? "Fix errors before saving"}
              </p>
            )}
            {errors.instructions && (
              <p className="text-sm text-danger">
                Steps: {getArrayErrorMessage(errors.instructions) ?? "Fix errors before saving"}
              </p>
            )}
            {serverError && (
              <p className="text-sm text-danger font-medium">{serverError}</p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" onClick={handleParsePastedRecipe}>
                Parse recipe
              </Button>
              {pasteSummary && (
                <Button type="button" variant="secondary" onClick={() => setEntryMode("manual")}>
                  Review in manual entry
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                className="flex-1"
                disabled={!pasteSummary}
              >
                Add to this book
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={entryGridClassName}>
          <div className="space-y-6">
            <section className={entryCardClassName}>
              <div className={entryCardHeaderClassName}>
                <span className={entryCardIconClassName}>
                  <WandSparkles size={18} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">Import from cookbook photo</p>
                  <p className="mt-1 text-sm leading-5 text-ink-soft">
                    Free OCR runs in your browser first. For better extraction, you can improve
                    the result with your own OpenAI API key.
                  </p>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!isImporting) importFileRef.current?.click();
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !isImporting) {
                    e.preventDefault();
                    importFileRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (!isImporting) setIsImportDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isImporting) setIsImportDragging(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setIsImportDragging(false);
                  }
                }}
                onDrop={handleImportDrop}
                className={clsx(
                  "mt-5 rounded-lg border-2 border-dashed p-4 text-center transition-colors",
                  "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
                  isImportDragging
                    ? "border-green-deep bg-green-pale"
                    : "border-line bg-paper-soft hover:border-green-sage hover:bg-green-pale/60",
                  isImporting && "cursor-wait opacity-80"
                )}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Camera size={20} className="text-green-deep" strokeWidth={1.8} />
                  <p className="text-sm font-bold text-ink">
                    {isImporting ? "Reading photo" : "Drop a recipe photo here"}
                  </p>
                  <p className="text-xs text-ink-soft">
                    or choose a JPEG, PNG, or WebP from your device
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    importFileRef.current?.click();
                  }}
                  loading={isImporting}
                  className="mt-3 justify-center"
                >
                  Choose photo
                </Button>
                {importFileName && (
                  <p className="mx-auto mt-2 max-w-full truncate text-xs font-medium text-ink-soft">
                    {importFileName}
                  </p>
                )}
              </div>
              {isImporting && (
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-card-muted">
                    <div
                      className="h-full rounded-full bg-green-deep transition-[width]"
                      style={{ width: `${Math.max(8, importProgress)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-medium text-ink-soft">
                    {importStatus ?? "Reading recipe text"}
                  </p>
                </div>
              )}
              <input
                ref={importFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImportImageChange}
                className="sr-only"
              />

              {importError && (
                <div className="mt-3 flex gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" strokeWidth={1.8} />
                  <p>{importError}</p>
                </div>
              )}

              {importedRecipe && (
                <div className="mt-4 rounded-lg border border-line bg-paper-soft p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-green-deep"
                      strokeWidth={1.8}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {importedRecipe.title}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        Found {importedRecipe.ingredients.length} ingredients and{" "}
                        {importedRecipe.instructions.length} steps. Confidence:{" "}
                        {importedRecipe.confidence}.
                        {importSource === "openai" && " Improved with OpenAI."}
                      </p>
                    </div>
                  </div>
                  {importedRecipe.warnings.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-ink-soft">
                      {importedRecipe.warnings.map((warning) => (
                        <li key={warning}>- {warning}</li>
                      ))}
                    </ul>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={applyImportedRecipe}
                    className="mt-3 w-full"
                  >
                    Apply to recipe form
                  </Button>
                  {preparedImportImage && importSource !== "openai" && (
                    hasOpenAIKey ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleImproveImport}
                        loading={isImprovingImport}
                        className="mt-2 w-full"
                      >
                        Improve with OpenAI
                      </Button>
                    ) : (
                      <div className="mt-3 rounded-md border border-accent-honey/35 bg-paper-warm/70 p-3">
                        <p className="text-xs font-bold text-green-deep">
                          Want better extraction?
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                          Add your OpenAI API key in{" "}
                          <a
                            href={`/app/books/${bookId}/settings`}
                            className="font-bold text-green-deep underline underline-offset-2"
                          >
                            Settings
                          </a>
                          . Your key is only used when you choose to improve an import.
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            <section className={entryCardClassName}>
              <div className={entryCardHeaderClassName}>
                <span className={entryCardIconClassName}>
                  <FileUp size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Import recipe files</p>
                  <p className="mt-1 text-sm leading-5 text-ink-soft">
                    Choose Paprika, Plan to Eat, HTML, JSON, TXT, CSV, or ZIP exports. Review
                    everything before saving.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileImportRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void parseRecipeFiles(Array.from(event.dataTransfer.files));
                }}
                className="mt-5 flex min-h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-paper-soft p-5 text-center transition hover:border-green-sage hover:bg-green-pale/60"
              >
                <FileUp size={24} className="text-green-deep" strokeWidth={1.8} />
                <span className="mt-2 text-sm font-bold text-ink">
                  {isFileParsing ? "Parsing files" : "Drop files here"}
                </span>
                <span className="mt-1 text-xs text-ink-soft">
                  or choose multiple exports from your device
                </span>
              </button>
              <input
                ref={fileImportRef}
                type="file"
                multiple
                accept=".paprikarecipes,.html,.htm,.json,.jsonld,.zip,.csv,.txt,text/html,application/json,application/zip,text/csv,text/plain"
                onChange={(event) => void parseRecipeFiles(Array.from(event.target.files ?? []))}
                className="sr-only"
              />

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-md border border-line bg-paper-soft p-3">
                  <p className="text-xl font-bold text-green-deep">{fileImportRecipes.length}</p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">Parsed</p>
                </div>
                <div className="rounded-md border border-line bg-paper-soft p-3">
                  <p className="text-xl font-bold text-green-deep">
                    {fileImportRecipes.reduce((count, recipe) => count + recipe.warnings.length, 0) + fileImportWarnings.length}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">Warnings</p>
                </div>
                <div className="rounded-md border border-line bg-paper-soft p-3">
                  <p className="text-xl font-bold text-green-deep">{skippedImportFiles.length}</p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">Skipped</p>
                </div>
              </div>

              {(fileImportError || skippedImportFiles.length > 0) && (
                <div className="mt-4 rounded-md border border-danger/25 bg-danger/5 p-3 text-sm text-danger">
                  {fileImportError && <p className="font-semibold">{fileImportError}</p>}
                  {skippedImportFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {skippedImportFiles.slice(0, 6).map((file) => (
                        <li key={`${file.fileName}-${file.reason}`}>
                          {file.fileName}: {file.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button type="button" variant="secondary" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={isSavingImport}
                  disabled={!fileImportRecipes.length || selectedImportIds.size === 0}
                  onClick={handleSaveImportedRecipes}
                >
                  Save selected recipes
                </Button>
              </div>
            </section>
          </div>

          <section className="space-y-3">
            {fileImportRecipes.length === 0 ? (
              <div className="rounded-xl border border-line bg-card p-8 text-center shadow-xs">
                <p className="text-sm font-bold text-ink">No recipes parsed yet</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Parsed recipes will appear here with checkboxes, warnings, and field previews.
                </p>
              </div>
            ) : (
              fileImportRecipes.map((recipe) => {
                const duplicateCounts = duplicateImportKeys(fileImportRecipes);
                const duplicateKey = `${recipe.title.toLowerCase().trim()}|${recipe.source_url?.toLowerCase().trim() ?? ""}`;
                const isDuplicate = (duplicateCounts.get(duplicateKey) ?? 0) > 1;
                const expanded = expandedImportId === recipe.id;
                const selected = selectedImportIds.has(recipe.id);

                return (
                  <article key={recipe.id} className="rounded-xl border border-line bg-card p-4 shadow-xs">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          setSelectedImportIds((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(recipe.id);
                            else next.delete(recipe.id);
                            return next;
                          });
                        }}
                        className="mt-1 size-4 accent-[var(--color-deep-green)]"
                        aria-label={`Select ${recipe.title}`}
                      />
                      {recipe.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={recipe.image.previewUrl} alt="" className="size-14 rounded-md object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-ink">{recipe.title}</h3>
                          {isDuplicate && (
                            <span className="rounded-sm bg-accent-honey/25 px-2 py-0.5 text-[11px] font-bold text-accent-cinnamon">
                              Possible duplicate
                            </span>
                          )}
                          {recipe.warnings.length > 0 && (
                            <span className="rounded-sm bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
                              {recipe.warnings.length} warning{recipe.warnings.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-ink-soft">
                          {recipe.import_source} · {recipe.ingredients.length} ingredients · {recipe.instructions.length} steps
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedImportId(expanded ? null : recipe.id)}
                        className="grid size-8 shrink-0 place-items-center rounded-sm text-green-deep hover:bg-green-pale"
                        aria-label={expanded ? "Collapse preview" : "Expand preview"}
                      >
                        <ChevronDown size={17} className={clsx("transition-transform", expanded && "rotate-180")} />
                      </button>
                    </div>

                    {expanded && (
                      <div className="mt-4 grid gap-4 border-t border-line pt-4 text-sm lg:grid-cols-2">
                        <div className="space-y-3">
                          {recipe.description && <p className="text-ink-soft">{recipe.description}</p>}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <p><span className="font-bold text-ink">Prep:</span> {formatDuration(recipe.prep_minutes) || "-"}</p>
                            <p><span className="font-bold text-ink">Cook:</span> {formatDuration(recipe.cook_minutes) || "-"}</p>
                            <p><span className="font-bold text-ink">Serves:</span> {recipe.servings ?? "-"}</p>
                          </div>
                          {recipe.source_url && (
                            <p className="truncate text-xs text-ink-muted">
                              <span className="font-bold text-ink">Source:</span> {recipe.source_url}
                            </p>
                          )}
                          {recipe.warnings.length > 0 && (
                            <ul className="space-y-1 text-xs text-danger">
                              {recipe.warnings.map((warning) => (
                                <li key={warning}>- {warning}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Ingredients</p>
                            <ul className="space-y-1 text-xs text-ink-soft">
                              {recipe.ingredients.slice(0, 8).map((ingredient, index) => (
                                <li key={`${ingredient.item}-${index}`} className="line-clamp-1">
                                  {[ingredient.quantity, ingredient.unit, ingredient.item].filter(Boolean).join(" ")}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">Steps</p>
                            <ol className="space-y-1 text-xs text-ink-soft">
                              {recipe.instructions.slice(0, 5).map((instruction, index) => (
                                <li key={`${instruction.body}-${index}`} className="line-clamp-2">
                                  {index + 1}. {instruction.body}
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}
    </form>
  );
}
