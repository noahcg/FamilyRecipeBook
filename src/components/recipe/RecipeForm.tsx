"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, ImagePlus } from "lucide-react";
import { clsx } from "clsx";
import { Button, Input, Textarea } from "@/components/ui";
import { createRecipeSchema, type CreateRecipeInput } from "@/lib/validators/recipe";
import { createRecipe, updateRecipe } from "@/lib/actions/recipes";
import { uploadRecipeImage } from "@/lib/upload";
import { useUser } from "@/lib/hooks/useUser";
import type { RecipeWithRelations } from "@/lib/types";

const CATEGORIES = [
  "Breakfast", "Lunch", "Dinner", "Dessert", "Snack",
  "Soup", "Salad", "Bread", "Drink", "Other",
];

interface RecipeFormProps {
  bookId: string;
  recipe?: RecipeWithRelations;
  onSuccessRedirect?: string;
}

export function RecipeForm({ bookId, recipe, onSuccessRedirect }: RecipeFormProps) {
  const router = useRouter();
  const { userId } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(recipe?.photo_url ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!recipe;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateRecipeInput>({
    resolver: zodResolver(createRecipeSchema) as Resolver<CreateRecipeInput>,
    defaultValues: recipe
      ? {
          title: recipe.title,
          description: recipe.description ?? "",
          source_name: recipe.source_name ?? "",
          story: recipe.story ?? "",
          prep_minutes: recipe.prep_minutes ?? undefined,
          cook_minutes: recipe.cook_minutes ?? undefined,
          servings: recipe.servings ?? undefined,
          category: recipe.category ?? "",
          tags: recipe.tags ?? [],
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
          source_name: "",
          story: "",
          tags: [],
          ingredients: [{ quantity: "", unit: "", item: "", note: "" }],
          instructions: [{ body: "" }],
        },
  });

  const {
    fields: ingredients,
    append: addIngredient,
    remove: removeIngredient,
  } = useFieldArray({ control, name: "ingredients" });

  const {
    fields: instructions,
    append: addInstruction,
    remove: removeInstruction,
  } = useFieldArray({ control, name: "instructions" });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(data: CreateRecipeInput) {
    setServerError(null);

    let photoUrl = recipe?.photo_url ?? undefined;

    if (photoFile && userId) {
      const uploaded = await uploadRecipeImage(photoFile, userId);
      if ("error" in uploaded) {
        setServerError(uploaded.error);
        return;
      }
      photoUrl = uploaded.url;
    }

    const payload = { ...data, photo_url: photoUrl };

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
      {/* Photo upload */}
      <div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "w-full aspect-video rounded-xl border-2 border-dashed",
            "flex flex-col items-center justify-center gap-2",
            "transition-colors hover:border-green-sage",
            photoPreview
              ? "border-transparent p-0 overflow-hidden"
              : "border-line text-ink-soft"
          )}
          style={{ background: photoPreview ? undefined : "var(--color-paper-warm)" }}
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Recipe photo preview"
              className="w-full h-full object-cover"
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
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="text-xs text-ink-soft underline mt-1"
          >
            Remove photo
          </button>
        )}
      </div>

      {/* Core fields */}
      <div className="space-y-4">
        <Input
          label="Recipe title"
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

      {/* Timing + servings */}
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

        {/* Category */}
        <div className="mt-3">
          <label className="text-sm font-semibold text-ink block mb-2">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="radio"
                  value={cat}
                  className="sr-only"
                  {...register("category")}
                />
                <span
                  className={clsx(
                    "px-3 py-1 rounded-pill text-sm font-medium border transition-colors cursor-pointer",
                    "hover:border-green-sage"
                  )}
                  style={{
                    background: "var(--color-paper-soft)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  {cat}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <p className="text-sm font-semibold text-ink mb-3">
          Ingredients{" "}
          {errors.ingredients && (
            <span className="text-danger font-normal ml-1">
              {typeof errors.ingredients === "object" && "message" in errors.ingredients
                ? (errors.ingredients as any).message
                : "Fix errors below"}
            </span>
          )}
        </p>
        <div className="space-y-2">
          {ingredients.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <GripVertical
                size={16}
                className="text-ink-soft mt-3.5 shrink-0 opacity-40"
              />
              <div className="grid grid-cols-12 gap-2 flex-1">
                <div className="col-span-3">
                  <input
                    className="input-cookbook text-sm"
                    placeholder="Qty"
                    {...register(`ingredients.${index}.quantity`)}
                  />
                </div>
                <div className="col-span-3">
                  <input
                    className="input-cookbook text-sm"
                    placeholder="Unit"
                    {...register(`ingredients.${index}.unit`)}
                  />
                </div>
                <div className="col-span-6">
                  <input
                    className="input-cookbook text-sm"
                    placeholder="Ingredient *"
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
                  onClick={() => removeIngredient(index)}
                  className="mt-3 text-ink-soft hover:text-danger transition-colors"
                  aria-label="Remove ingredient"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            addIngredient({ quantity: "", unit: "", item: "", note: "" })
          }
          className="mt-2 flex items-center gap-1.5 text-sm text-green-deep font-semibold hover:underline"
        >
          <Plus size={14} /> Add ingredient
        </button>
      </div>

      {/* Instructions */}
      <div>
        <p className="text-sm font-semibold text-ink mb-3">
          Steps{" "}
          {errors.instructions && (
            <span className="text-danger font-normal ml-1">
              {typeof errors.instructions === "object" && "message" in errors.instructions
                ? (errors.instructions as any).message
                : "Fix errors below"}
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
                  className="input-cookbook text-sm min-h-16 resize-none"
                  placeholder={`Step ${index + 1}…`}
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          className="flex-1"
        >
          {isEdit ? "Save changes" : "Add to this book"}
        </Button>
      </div>
    </form>
  );
}
