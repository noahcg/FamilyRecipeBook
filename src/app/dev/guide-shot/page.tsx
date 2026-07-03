import { notFound } from "next/navigation";
import {
  BookOpen,
  Camera,
  CalendarDays,
  Check,
  Crown,
  FileText,
  PencilLine,
  Plus,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";
import { Input, BookCoverArt } from "@/components/ui";
import { AddMemberForm } from "@/components/book/AddMemberForm";
import { resolveCoverColor } from "@/lib/bookCovers";

// Dev-only harness for capturing the onboarding-guide hero screenshots.
//
// Each guide step's hero shows the SCREEN THE USER LANDS ON after tapping the
// highlighted control (not the control itself — the in-app beacon already marks
// that). The data-driven destinations (Members list, Meal Plan, Groceries, new
// recipe) can't render here unauthenticated — their components fetch on mount
// and would redirect to /sign-in — so those are faithful reproductions built
// from the real design system + sample data. The Add Member form and cookbook
// cover art are the REAL components.
//
// Everything renders inside #shot-frame (a fixed 16:10 box) which the capture
// script (scripts/capture-guides.mjs, `npm run capture:guides`) screenshots
// directly. Keep in sync with the real screens; available only outside prod.

const EYEBROW = "text-[11px] font-bold uppercase tracking-[0.1em] text-accent-cinnamon";
const H2 =
  "text-3xl font-bold leading-tight text-green-deep";
const PLAYFAIR = { fontFamily: "var(--font-playfair)" } as const;

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-ink-inverse"
      style={{ background: color }}
    >
      {initials}
    </span>
  );
}

const ROLES = [
  { icon: Crown, label: "Keeper", desc: "Owns the cookbook and manages members." },
  { icon: BookOpen, label: "Contributor", desc: "Can add and edit recipes and notes." },
  { icon: Users, label: "Family", desc: "Can view, react, and add notes and memories." },
];

function RoleGuide() {
  return (
    <div className="rounded-xl border border-line-soft bg-card/70 p-4">
      <p className="mb-3 text-sm font-bold text-green-deep">What the roles mean</p>
      <div className="space-y-3">
        {ROLES.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--color-sage-soft)" }}
            >
              <Icon size={15} strokeWidth={1.9} className="text-green-deep" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="text-xs leading-snug text-ink-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SAMPLE_BOOKS = [
  { title: "The Family Table", recipes: 24, seed: "family-table" },
  { title: "Grandma's Classics", recipes: 12, seed: "grandmas" },
  { title: "Weeknight Dinners", recipes: 8, seed: "weeknight" },
];

function Bookshelf() {
  return (
    <div className="mx-auto flex h-full max-w-[420px] flex-col overflow-hidden rounded-xl border border-line bg-card shadow-[0_18px_50px_rgba(31,58,45,0.16)]">
      <div className="border-b border-line-soft px-5 py-4">
        <h2 className="text-2xl font-bold leading-tight text-green-deep" style={PLAYFAIR}>
          Your Cookbooks
        </h2>
      </div>
      <div className="space-y-2 px-3 py-3">
        {SAMPLE_BOOKS.map((b, i) => (
          <div
            key={b.seed}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
              i === 0
                ? "border-green-sage/40 bg-green-soft/80 shadow-xs"
                : "border-transparent bg-white-soft/45"
            }`}
          >
            <span className="block w-9 shrink-0 overflow-hidden">
              <BookCoverArt
                title={b.title}
                seed={b.seed}
                color={resolveCoverColor(undefined, b.seed)}
                className="w-9 shrink-0"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-green-deep">{b.title}</span>
              <span className="block truncate text-xs font-semibold text-ink-soft">
                {b.recipes} recipes
              </span>
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-green-sage/55 bg-paper-warm/70 px-3 py-2.5 text-sm font-bold text-green-deep">
          <Plus size={15} /> New Cookbook
        </div>
      </div>
    </div>
  );
}

const RECIPE_METHODS = [
  { icon: PencilLine, label: "Type it in", desc: "Enter the recipe by hand." },
  { icon: Camera, label: "From a photo", desc: "Snap a recipe card and we read it." },
  { icon: FileText, label: "Paste text", desc: "Paste it and we'll format it." },
];

function NewRecipe() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {RECIPE_METHODS.map(({ icon: Icon, label, desc }, i) => (
          <div
            key={label}
            className={`rounded-xl border-2 p-4 ${
              i === 0 ? "border-green-deep bg-green-soft/60" : "border-line bg-paper-soft"
            }`}
          >
            <span
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: "var(--color-sage-soft)" }}
            >
              <Icon size={17} strokeWidth={1.8} className="text-green-deep" />
            </span>
            <p className="text-sm font-bold text-ink">{label}</p>
            <p className="mt-0.5 text-xs leading-snug text-ink-muted">{desc}</p>
          </div>
        ))}
      </div>
      <Input label="Recipe title" placeholder="Sunday Roast Chicken" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Prep time" placeholder="20 min" />
        <Input label="Cook time" placeholder="1 hr" />
      </div>
    </div>
  );
}

const WEEK = [
  { day: "Mon", meal: "Roast Chicken" },
  { day: "Tue", meal: null },
  { day: "Wed", meal: "Beef Tacos" },
  { day: "Thu", meal: null },
  { day: "Fri", meal: "Margherita Pizza" },
  { day: "Sat", meal: "Leftovers" },
  { day: "Sun", meal: null },
];

function MealPlan() {
  return (
    <div className="space-y-2.5">
      {WEEK.map(({ day, meal }) => (
        <div
          key={day}
          className="flex items-center gap-4 rounded-lg border border-line-soft bg-card/70 px-4 py-2.5"
        >
          <span className="w-10 shrink-0 text-sm font-bold text-green-deep">{day}</span>
          {meal ? (
            <span className="flex-1 rounded-md bg-green-soft/70 px-3 py-1.5 text-sm font-semibold text-green-deep">
              {meal}
            </span>
          ) : (
            <span className="flex flex-1 items-center gap-1.5 text-sm font-semibold text-ink-soft/70">
              <Plus size={14} /> Add a meal
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const GROCERY_SECTIONS = [
  {
    name: "Produce",
    items: [
      { name: "Yellow onions", qty: "2", done: false },
      { name: "Garlic", qty: "1 bulb", done: true },
      { name: "Roma tomatoes", qty: "4", done: false },
    ],
  },
  {
    name: "Dairy & Eggs",
    items: [
      { name: "Whole milk", qty: "1 gal", done: false },
      { name: "Large eggs", qty: "1 dozen", done: false },
    ],
  },
];

function Groceries() {
  return (
    <div className="space-y-5">
      {GROCERY_SECTIONS.map((section) => (
        <div key={section.name}>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
            {section.name}
          </p>
          <div className="space-y-1.5">
            {section.items.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-lg border border-line-soft bg-card/70 px-4 py-2.5"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                    item.done ? "border-green-deep bg-green-deep text-ink-inverse" : "border-line"
                  }`}
                >
                  {item.done && <Check size={13} strokeWidth={3} />}
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${
                    item.done ? "text-ink-soft line-through" : "text-ink"
                  }`}
                >
                  {item.name}
                </span>
                <span className="text-sm font-semibold text-ink-soft">{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const RECIPE_CHAPTERS = [
  {
    number: "01",
    category: "Mains",
    recipes: [
      { title: "Sunday Roast Chicken", book: "The Family Table", meta: "Grandma Rosa · 1 hr · Serves 4" },
      { title: "Beef & Bean Chili", book: "Weeknight Dinners", meta: "45 min · Serves 6" },
    ],
  },
  {
    number: "02",
    category: "Sweets",
    recipes: [
      { title: "Brown Butter Chocolate Chip Cookies", book: "Grandma's Classics", meta: "Aunt Lucy · 25 min" },
    ],
  },
];

function CookbookPill({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-green-sage/40 bg-green-soft px-2 py-0.5 text-xs font-bold text-green-deep">
      <BookOpen size={11} strokeWidth={2} className="shrink-0" />
      {title}
    </span>
  );
}

function MyRecipes() {
  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_260px] gap-6">
      <div className="min-w-0 space-y-6">
        {RECIPE_CHAPTERS.map((chapter) => (
          <section key={chapter.category}>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="text-xs font-bold text-accent-cinnamon">{chapter.number}</span>
              <h3 className="text-xl font-bold leading-tight text-green-deep" style={PLAYFAIR}>
                {chapter.category}
              </h3>
              <span className="h-px flex-1 bg-line-soft" />
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                {chapter.recipes.length}
              </span>
            </div>
            <ol className="divide-y divide-line-soft/60">
              {chapter.recipes.map((recipe) => (
                <li key={recipe.title} className="py-3">
                  <span className="mb-2 flex">
                    <CookbookPill title={recipe.book} />
                  </span>
                  <p className="text-base font-semibold leading-snug text-ink" style={PLAYFAIR}>
                    {recipe.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">{recipe.meta}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <aside className="overflow-hidden rounded-xl border border-line bg-card shadow-xs">
        <div className="border-b border-line-soft bg-paper-warm px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-cinnamon">Across your books</p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight text-green-deep" style={PLAYFAIR}>
            Chapter Index
          </h3>
        </div>
        <nav className="px-4 py-2">
          {RECIPE_CHAPTERS.map((chapter) => (
            <span
              key={chapter.category}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-line-soft py-2.5 last:border-b-0"
            >
              <span className="text-xs font-bold text-accent-cinnamon">{chapter.number}</span>
              <span className="truncate text-sm font-semibold text-ink" style={PLAYFAIR}>
                {chapter.category}
              </span>
              <span className="rounded-sm bg-paper-warm px-2 py-0.5 text-xs font-bold text-ink-soft">
                {chapter.recipes.length}
              </span>
            </span>
          ))}
        </nav>
      </aside>
    </div>
  );
}

const MEMBERS = [
  { initials: "YO", name: "You", role: "Keeper", color: "#2f4a3a" },
  { initials: "MR", name: "Maria Rivera", role: "Contributor", color: "#c0703f" },
  { initials: "JL", name: "James Lee", role: "Family", color: "#7a8b5a" },
];

function MembersList() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-5">
      <div className="space-y-2">
        {MEMBERS.map((m) => (
          <div
            key={m.name}
            className="flex items-center gap-3 rounded-lg border border-line-soft bg-card/70 px-4 py-3"
          >
            <Avatar initials={m.initials} color={m.color} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-green-deep">
              {m.name}
            </span>
            <span className="rounded-sm bg-green-pale px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-green-deep">
              {m.role}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-line px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-muted text-ink-soft">
            <UserPlus size={16} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-muted">
            aunt.rosa@example.com
          </span>
          <span className="rounded-sm bg-card-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            Invited
          </span>
        </div>
      </div>
      <RoleGuide />
    </div>
  );
}

function FrameHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className={`mt-1 ${H2}`} style={PLAYFAIR}>
        {title}
      </h2>
    </div>
  );
}

export default async function GuideShotHarness({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const { screen = "members" } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper-warm p-6">
      {/* Fixed 16:10 capture frame. */}
      <div
        id="shot-frame"
        className="app-paper-bg paper-texture relative overflow-hidden rounded-xl"
        style={{ width: 960, height: 600 }}
      >
        <div className="flex h-full flex-col justify-center overflow-hidden p-8">
          {screen === "members" && (
            <>
              <FrameHeader eyebrow="The Family Table" title="Members" />
              <MembersList />
            </>
          )}

          {screen === "add-member" && (
            <>
              <FrameHeader eyebrow="The Family Table" title="Add someone" />
              <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-6">
                <div className="rounded-xl border border-line-soft bg-card/60 p-5">
                  <AddMemberForm bookId="demo" bookTitle="The Family Table" />
                </div>
                <RoleGuide />
              </div>
            </>
          )}

          {screen === "my-recipes" && (
            <div className="flex h-full flex-col">
              <FrameHeader eyebrow="Your collection" title="My Recipes" />
              <div className="min-h-0 flex-1">
                <MyRecipes />
              </div>
            </div>
          )}

          {screen === "new-recipe" && (
            <>
              <FrameHeader eyebrow="The Family Table" title="New recipe" />
              <NewRecipe />
            </>
          )}

          {screen === "bookshelf" && (
            <div className="flex h-full flex-col">
              <FrameHeader eyebrow="Cookbooks" title="Your bookshelf" />
              <div className="min-h-0 flex-1">
                <Bookshelf />
              </div>
            </div>
          )}

          {screen === "meal-plan" && (
            <>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className={EYEBROW}>This week</p>
                  <h2 className={`mt-1 ${H2}`} style={PLAYFAIR}>
                    Meal Plan
                  </h2>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
                  <CalendarDays size={16} /> Jun 30 – Jul 6
                </span>
              </div>
              <MealPlan />
            </>
          )}

          {screen === "groceries" && (
            <>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className={EYEBROW}>From your meal plan</p>
                  <h2 className={`mt-1 ${H2}`} style={PLAYFAIR}>
                    Groceries
                  </h2>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
                  <ShoppingCart size={16} /> 5 items
                </span>
              </div>
              <Groceries />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
