"use client";

import { useState, useTransition, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X, Search } from "lucide-react";
import { clsx } from "clsx";
import { getMealPlanWeek, setMealPlan, removeMealPlan } from "@/lib/actions/households";
import type { MealPlan, MealSlot } from "@/lib/types";

interface Recipe {
  id: string;
  title: string;
  photo_url: string | null;
  category: string | null;
}

interface MealPlanWithRecipe extends MealPlan {
  recipe: { title: string; photo_url: string | null } | null;
}

interface Props {
  householdId: string;
  initialWeekStart: string;
  initialMealPlans: MealPlanWithRecipe[];
  recipes: Recipe[];
}

const SLOTS: { key: MealSlot; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatMonthRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(weekStart + "T00:00:00");
  end.setDate(end.getDate() + 6);

  if (start.getMonth() === end.getMonth()) {
    return `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${MONTH_NAMES[start.getMonth()]} – ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export function MealPlanCalendar({
  householdId,
  initialWeekStart,
  initialMealPlans,
  recipes,
}: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [mealPlans, setMealPlans] = useState<MealPlanWithRecipe[]>(initialMealPlans);
  const [isPending, startTransition] = useTransition();

  // Picker state
  const [picking, setPicking] = useState<{ date: string; slot: MealSlot } | null>(null);
  const [search, setSearch] = useState("");

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getMeal = useCallback(
    (date: string, slot: MealSlot) =>
      mealPlans.find((m) => m.planned_date === date && m.meal_slot === slot) ?? null,
    [mealPlans]
  );

  function getThisMonday(): string {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  }

  function goToToday() {
    const thisMonday = getThisMonday();
    if (thisMonday === weekStart) return;
    startTransition(async () => {
      const newPlans = await getMealPlanWeek(householdId, thisMonday);
      setWeekStart(thisMonday);
      setMealPlans(newPlans as MealPlanWithRecipe[]);
    });
  }

  function navigateWeek(delta: number) {
    startTransition(async () => {
      const newWeek = addDays(weekStart, delta * 7);
      const newPlans = await getMealPlanWeek(householdId, newWeek);
      setWeekStart(newWeek);
      setMealPlans(newPlans as MealPlanWithRecipe[]);
    });
  }

  function openPicker(date: string, slot: MealSlot) {
    setSearch("");
    setPicking({ date, slot });
  }

  function closePicker() {
    setPicking(null);
    setSearch("");
  }

  function handleAssign(recipe: Recipe) {
    if (!picking) return;
    const { date, slot } = picking;
    closePicker();
    startTransition(async () => {
      const result = await setMealPlan(householdId, recipe.id, date, slot);
      if (result.success) {
        const newPlan: MealPlanWithRecipe = {
          ...result.data,
          recipe: { title: recipe.title, photo_url: recipe.photo_url },
        };
        setMealPlans((prev) => [
          ...prev.filter((m) => !(m.planned_date === date && m.meal_slot === slot)),
          newPlan,
        ]);
      }
    });
  }

  function handleRemove(date: string, slot: MealSlot) {
    startTransition(async () => {
      await removeMealPlan(householdId, date, slot);
      setMealPlans((prev) =>
        prev.filter((m) => !(m.planned_date === date && m.meal_slot === slot))
      );
    });
  }

  const filteredRecipes = search.trim()
    ? recipes.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.category ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : recipes;

  return (
    <>
      {/* Page header */}
      <div className="sticky top-0 z-20 border-b border-line-soft bg-[rgba(251,247,237,0.95)] px-6 py-4 backdrop-blur-sm lg:rounded-tr-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Meal Plan
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">{formatMonthRange(weekStart)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateWeek(-1)}
              disabled={isPending}
              aria-label="Previous week"
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-card/70 hover:text-ink disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goToToday()}
              disabled={isPending}
              className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-card/70 hover:text-ink disabled:opacity-40"
            >
              Today
            </button>
            <button
              onClick={() => navigateWeek(1)}
              disabled={isPending}
              aria-label="Next week"
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-card/70 hover:text-ink disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden lg:block px-6 py-5">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDates.map((date, i) => (
            <div key={date} className="text-center">
              <p className={clsx("text-[11px] font-bold uppercase tracking-widest", isToday(date) ? "text-green-deep" : "text-ink-muted")}>
                {DAY_SHORT[i]}
              </p>
              <p className={clsx("mt-0.5 text-lg font-semibold leading-none", isToday(date) ? "text-green-deep" : "text-ink")}>
                {new Date(date + "T00:00:00").getDate()}
              </p>
            </div>
          ))}
        </div>

        {SLOTS.map(({ key: slot, label }) => (
          <div key={slot} className="mb-4">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date) => {
                const meal = getMeal(date, slot);
                return (
                  <SlotCell
                    key={date}
                    meal={meal}
                    isToday={isToday(date)}
                    onAdd={() => openPicker(date, slot)}
                    onRemove={() => handleRemove(date, slot)}
                    isPending={isPending}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: stacked day cards */}
      <div className="lg:hidden divide-y divide-line-soft">
        {weekDates.map((date, i) => (
          <div key={date} className="px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <div
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  isToday(date)
                    ? "bg-green-deep text-ink-inverse"
                    : "bg-card text-ink"
                )}
              >
                {new Date(date + "T00:00:00").getDate()}
              </div>
              <span className={clsx("text-sm font-semibold", isToday(date) ? "text-green-deep" : "text-ink")}>
                {DAY_FULL[i]}
              </span>
            </div>
            <div className="space-y-2">
              {SLOTS.map(({ key: slot, label }) => {
                const meal = getMeal(date, slot);
                return (
                  <div key={slot} className="flex items-start gap-2">
                    <span className="w-20 shrink-0 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                      {label}
                    </span>
                    <div className="flex-1">
                      <SlotCell
                        meal={meal}
                        isToday={isToday(date)}
                        onAdd={() => openPicker(date, slot)}
                        onRemove={() => handleRemove(date, slot)}
                        isPending={isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Recipe picker overlay */}
      {picking && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center" aria-modal="true" role="dialog" aria-label="Pick a recipe">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closePicker}
          />

          {/* Sheet */}
          <div className="relative z-10 flex w-full flex-col sm:max-w-lg sm:rounded-2xl overflow-hidden mt-auto sm:mt-0 max-h-[85dvh]"
            style={{ background: "var(--color-paper-soft)" }}>
            <div className="flex shrink-0 items-center justify-between border-b border-line-soft px-5 py-4">
              <div>
                <p className="font-semibold text-ink">Choose a recipe</p>
                <p className="text-xs text-ink-muted capitalize">
                  {DAY_FULL[weekDates.indexOf(picking.date)]} · {picking.slot}
                </p>
              </div>
              <button
                onClick={closePicker}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-card/70 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="shrink-0 px-4 py-3">
              <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-card px-3 py-2">
                <Search size={14} className="shrink-0 text-ink-muted" />
                <input
                  autoFocus
                  type="search"
                  placeholder="Search recipes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {filteredRecipes.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">No recipes found</p>
              ) : (
                <div className="space-y-2">
                  {filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleAssign(recipe)}
                      className="flex w-full items-center gap-3 rounded-xl border border-line-soft bg-card px-3 py-2.5 text-left transition-colors hover:border-green-deep/30 hover:bg-green-soft/30"
                    >
                      {recipe.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={recipe.photo_url}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-soft text-green-deep">
                          <CalendarDays size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{recipe.title}</p>
                        {recipe.category && (
                          <p className="text-xs text-ink-muted">{recipe.category}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface SlotCellProps {
  meal: MealPlanWithRecipe | null;
  isToday: boolean;
  onAdd: () => void;
  onRemove: () => void;
  isPending: boolean;
}

function SlotCell({ meal, isToday, onAdd, onRemove, isPending }: SlotCellProps) {
  if (meal?.recipe) {
    return (
      <div
        className={clsx(
          "group relative min-h-[72px] rounded-xl border p-2 transition-colors",
          isToday
            ? "border-green-deep/30 bg-green-soft/40"
            : "border-line-soft bg-card"
        )}
      >
        {meal.recipe.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.recipe.photo_url}
            alt=""
            className="mb-1.5 h-12 w-full rounded-lg object-cover"
          />
        )}
        <p className="line-clamp-2 text-xs font-semibold text-ink leading-snug">
          {meal.recipe.title}
        </p>
        <button
          onClick={onRemove}
          disabled={isPending}
          aria-label="Remove recipe"
          className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white group-hover:flex disabled:opacity-40"
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onAdd}
      disabled={isPending}
      aria-label="Add recipe"
      className={clsx(
        "flex min-h-[72px] w-full items-center justify-center rounded-xl border border-dashed transition-colors disabled:opacity-40",
        isToday
          ? "border-green-deep/40 text-green-deep hover:bg-green-soft/30"
          : "border-line-soft text-ink-muted hover:border-green-deep/30 hover:bg-green-soft/20 hover:text-green-deep"
      )}
    >
      <Plus size={16} strokeWidth={1.75} />
    </button>
  );
}
