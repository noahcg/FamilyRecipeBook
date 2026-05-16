"use client";

import { useEffect, useState, useRef, type RefObject } from "react";
import { useForm, useFieldArray, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, ClipboardPaste, Plus, Trash2, GripVertical, ImagePlus, WandSparkles } from "lucide-react";
import { clsx } from "clsx";
import { Button, Input, Textarea } from "@/components/ui";
import { improveRecipeImportWithOpenAI } from "@/lib/actions/recipeImageImport";
import { createRecipeSchema, type CreateRecipeInput } from "@/lib/validators/recipe";
import { createRecipe, updateRecipe } from "@/lib/actions/recipes";
import { uploadRecipeImage } from "@/lib/upload";
import {
  importRecipeWithLocalOcr,
  prepareRecipeImportImage,
  type ImportedRecipe,
} from "@/lib/imageImport";
import { selectRecipeImage } from "@/lib/actions/pexels";
import { parsePastedRecipe } from "@/lib/recipeTextImport";
import { useUser } from "@/lib/hooks/useUser";
import { RECIPE_CATEGORIES } from "@/lib/recipeCategories";
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

function hasFieldValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function formatMinutes(minutes?: number) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
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
  const [entryMode, setEntryMode] = useState<"manual" | "paste">("manual");
  const [pastedRecipe, setPastedRecipe] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSummary, setPasteSummary] = useState<string | null>(null);
  const [pasteDetails, setPasteDetails] = useState<PasteDetails>({});
  const [activeIngredientKeypad, setActiveIngredientKeypad] = useState<IngredientKeypadTarget | null>(null);
  const [manualIngredientKeypad, setManualIngredientKeypad] = useState<IngredientKeypadTarget | null>(null);

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
          category: recipe.category ?? "",
          tags: recipe.tags ?? [],
          import_method: recipe.import_method,
          ingredients: recipe.ingredients?.length
            ? recipe.ingredients.map((i) => ({
                quantity: i.quantity ?? "",
                unit: i.unit ?? "",
                item: i.item,
                note: i.note ?? "",
              }))
            : [{ quantity: "", unit: "", item: "", note: "" }],
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
          ingredients: [{ quantity: "", unit: "", item: "", note: "" }],
          instructions: [{ body: "" }],
        },
  });

  const {
    fields: ingredients,
    append: addIngredient,
    remove: removeIngredient,
    replace: replaceIngredients,
  } = useFieldArray({ control, name: "ingredients" });

  const {
    fields: instructions,
    append: addInstruction,
    remove: removeInstruction,
    replace: replaceInstructions,
  } = useFieldArray({ control, name: "instructions" });

  const selectedCategory = useWatch({ control, name: "category" });

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

    // Auto-select from Pexels when creating a new recipe without a photo
    if (!photoUrl && !isEdit) {
      const ingredientNames = data.ingredients.map((i) => i.item).filter(Boolean);
      const auto = await selectRecipeImage(data.title, ingredientNames);
      if (auto) photoUrl = auto;
    }

    const payload = {
      ...data,
      photo_url: photoUrl,
      import_method: recipeImportedViaUpload ? "image_upload" : data.import_method,
    } satisfies CreateRecipeInput;

    if (isEdit && recipe) {
      const result = await updateRecipe(bookId, recipe.id, payload);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push(
        onSuccessRedirect ?? `/app/books/${bookId}/recipes/${recipe.id}`
      );
    } else {
      const result = await createRecipe(bookId, payload as CreateRecipeInput);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push(
        onSuccessRedirect ?? `/app/books/${bookId}/recipes/${result.data.id}`
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-10">
      {showPasteEntry && (
        <div className="mb-6 inline-flex rounded-full border border-line bg-paper-soft p-1 shadow-xs">
          {[
            ["manual", "Manual entry"],
            ["paste", "Copy/paste"],
          ].map(([mode, label]) => {
            const selected = entryMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setEntryMode(mode as "manual" | "paste")}
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
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">

        {/* ── Left column: photo + about + details ── */}
        <div className="space-y-6">
          {!isEdit && (
            <section
              className="rounded-xl border border-line p-4"
              style={{ background: "var(--color-card)" }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "var(--color-sage-pale)",
                    color: "var(--color-deep-green)",
                  }}
                >
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
                  "mt-4 rounded-lg border-2 border-dashed p-4 text-center transition-colors",
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
          )}

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
                "aspect-[4/3] lg:aspect-[3/2]"
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
            <Input
              label="Short description (optional)"
              placeholder="A one-line description of the dish"
              error={errors.description?.message}
              {...register("description")}
            />
          </div>

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
                {RECIPE_CATEGORIES.map((cat) => {
                  const selected = selectedCategory === cat;
                  return (
                    <label key={cat} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value={cat}
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
                        {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: ingredients + steps + actions ── */}
        <div className="space-y-8">

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
              {ingredients.map((field, index) => (
                <div key={field.id} className="relative flex gap-2 items-start">
                  <GripVertical size={16} className="text-ink-soft mt-3.5 shrink-0 opacity-40" />
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
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveIngredientKeypad(null);
                setManualIngredientKeypad(null);
                addIngredient({ quantity: "", unit: "", item: "", note: "" });
              }}
              className="mt-2 flex items-center gap-1.5 text-sm text-green-deep font-semibold hover:underline"
            >
              <Plus size={14} /> Add ingredient
            </button>
          </div>

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
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
          <div className="space-y-6">
            <section className="rounded-xl border border-line bg-card p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-pale text-green-deep">
                  <ClipboardPaste size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Copy/paste a recipe</p>
                  <p className="mt-1 text-sm leading-5 text-ink-soft">
                    Paste a full recipe, parse it into structured fields, then
                    review or save. The original manual form stays unchanged.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Input
                  label="Recipe title"
                  required
                  placeholder="e.g. Grandma's Apple Pie"
                  error={errors.title?.message}
                  {...register("title")}
                />
                <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-3">
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
                <Input
                  label="Who is this from?"
                  placeholder="e.g. Grandma Rose"
                  error={errors.source_name?.message}
                  {...register("source_name")}
                />
              </div>
            </section>

            <section className="rounded-xl border border-line bg-card p-5 shadow-xs">
              <p className="text-sm font-semibold text-ink mb-3">Category</p>
              <div className="flex flex-wrap gap-2">
                {RECIPE_CATEGORIES.map((cat) => {
                  const selected = selectedCategory === cat;
                  return (
                    <label key={cat} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value={cat}
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
                        {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <Textarea
              label="Paste recipe"
              placeholder={"Grandma's Apple Pie\n\nIngredients\n6 cups sliced apples\n3/4 cup sugar\n1 tsp cinnamon\n\nInstructions\n1. Preheat oven to 375°F.\n2. Toss apples with sugar and cinnamon.\n3. Bake until golden."}
              hint="Paste the full recipe. For best results, include Ingredients and Instructions headings."
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
                      You can save now or review the generated fields in Manual entry.
                    </p>
                  </div>
                </div>
                {Object.values(pasteDetails).some(Boolean) && (
                  <div className="mt-3 rounded-md border border-green-sage/25 bg-white-soft/60 p-3">
                    <p className="mb-2 text-xs font-bold text-ink">Details</p>
                    <div className="grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
                      {pasteDetails.title && (
                        <p className="truncate">
                          <span className="font-bold text-ink">Title:</span> {pasteDetails.title}
                        </p>
                      )}
                      {pasteDetails.prep_minutes && (
                        <p>
                          <span className="font-bold text-ink">Prep:</span> {formatMinutes(pasteDetails.prep_minutes)}
                        </p>
                      )}
                      {pasteDetails.cook_minutes && (
                        <p>
                          <span className="font-bold text-ink">Cook:</span> {formatMinutes(pasteDetails.cook_minutes)}
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
      )}
    </form>
  );
}
