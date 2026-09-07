"use client";

import { useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  Heart,
  Layers3,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  BookCoverArt,
  BottomNav,
  BrandLockup,
  Button,
  Card,
  CardBody,
  CardHeader,
  CookbookIcon,
  cookbookIconCatalog,
  Dialog,
  Drawer,
  EmptyState,
  Input,
  MemberAvatarStack,
  ReactionPill,
  RecipeCard,
  RecipeStoryNote,
  SectionHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { UI_LIBRARY } from "@/components/ui/registry";
import { BOOK_COVER_COLORS } from "@/lib/bookCovers";

const PLAYFAIR = { fontFamily: "var(--font-playfair)" } as const;

const SECTIONS = [
  ["foundations", "Foundations"],
  ["actions", "Actions"],
  ["forms", "Forms"],
  ["feedback", "Feedback"],
  ["surfaces", "Surfaces"],
  ["identity", "Identity"],
  ["navigation", "Navigation"],
  ["inventory", "Inventory"],
] as const;

const BUTTON_VARIANTS = ["primary", "secondary", "ghost", "danger"] as const;
const BUTTON_SIZES = ["sm", "md", "lg"] as const;
const BADGE_VARIANTS = ["default", "sage", "terracotta", "mustard", "keeper", "contributor", "family"] as const;
const SAMPLE_MEMBERS = [
  { id: "rosa", name: "Rosa Martinez" },
  { id: "david", name: "David Martinez" },
  { id: "nora", name: "Nora Martinez" },
  { id: "milo", name: "Milo Martinez" },
  { id: "jo", name: "Jo Martinez" },
];

const COLOR_SWATCHES = [
  { label: "Deep green", variable: "--color-deep-green", use: "Primary action & headings" },
  { label: "Sage", variable: "--color-sage", use: "Selection & supporting detail" },
  { label: "Terracotta", variable: "--color-terracotta", use: "Warm emphasis" },
  { label: "Paper", variable: "--color-paper", use: "Primary surface" },
  { label: "Ink", variable: "--color-ink", use: "Body text" },
  { label: "Danger", variable: "--color-danger", use: "Destructive actions & errors" },
];

function CatalogSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line-soft py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-accent-cinnamon">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-green-deep" style={PLAYFAIR}>
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">{description}</p>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function Example({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line-soft bg-card/75 shadow-xs">
      <div className="border-b border-line-soft bg-white-soft/50 px-4 py-3">
        <p className="text-sm font-bold text-green-deep">{title}</p>
        {note && <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{note}</p>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function UiCatalog() {
  const [dialogMode, setDialogMode] = useState<"decision" | "utility" | null>(null);
  const [drawerWithEyebrow, setDrawerWithEyebrow] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<"home" | "search" | "add" | "favorites" | "profile">("home");

  return (
    <main className="app-paper-bg paper-texture min-h-dvh px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-2xl border border-line bg-card/90 p-6 shadow-paper sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-accent-cinnamon">
                Home Cooked · UI library · development only
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-[1.02] text-green-deep sm:text-5xl" style={PLAYFAIR}>
                One warm, familiar interface.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                The living visual reference for shared components, states, and interaction patterns.
                Build from these primitives before inventing another treatment.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
              <div className="rounded-lg bg-green-pale px-3 py-3">
                <Layers3 size={17} className="text-green-deep" />
                <p className="mt-2 text-lg font-bold text-green-deep">{UI_LIBRARY.length}</p>
                <p className="text-[11px] font-semibold text-ink-soft">primitives</p>
              </div>
              <div className="rounded-lg bg-card-muted px-3 py-3">
                <Check size={17} className="text-green-deep" />
                <p className="mt-2 text-lg font-bold text-green-deep">A11y</p>
                <p className="text-[11px] font-semibold text-ink-soft">built in</p>
              </div>
              <div className="rounded-lg bg-paper-warm px-3 py-3">
                <Sparkles size={17} className="text-accent-cinnamon" />
                <p className="mt-2 text-lg font-bold text-green-deep">AI-ready</p>
                <p className="text-[11px] font-semibold text-ink-soft">documented</p>
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="UI library sections" className="sticky top-3 z-40 mt-5 overflow-x-auto rounded-lg border border-line-soft bg-card/95 p-1.5 shadow-sm backdrop-blur">
          <div className="flex min-w-max gap-1">
            {SECTIONS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-md px-3 py-2 text-sm font-bold text-ink-muted transition hover:bg-green-pale hover:text-green-deep focus-visible:bg-green-pale"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <CatalogSection
          id="foundations"
          eyebrow="01 · Foundations"
          title="A quiet paper palette with clear hierarchy."
          description="Use semantic tokens rather than new hex values. Playfair carries meaningful headings; Nunito keeps product UI readable and practical."
        >
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Example title="Color roles" note="Use the role, not the color name, when choosing a treatment.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {COLOR_SWATCHES.map((swatch) => (
                  <div key={swatch.variable} className="min-w-0">
                    <div
                      className="h-16 rounded-lg border border-black/5 shadow-xs"
                      style={{ background: `var(${swatch.variable})` }}
                    />
                    <p className="mt-2 text-xs font-bold text-green-deep">{swatch.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">{swatch.use}</p>
                  </div>
                ))}
              </div>
            </Example>
            <Example title="Type & shape" note="Rounded surfaces are modest; decorative type is reserved for hierarchy.">
              <p className="text-3xl font-bold leading-tight text-green-deep" style={PLAYFAIR}>
                A recipe worth keeping
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Product copy stays clear, generous, and family-centered. Use strong labels and short supporting text.
              </p>
              <div className="mt-5 flex items-center gap-2">
                {[
                  ["6px", "rounded-md"],
                  ["9px", "rounded-lg"],
                  ["12px", "rounded-xl"],
                ].map(([label, radius]) => (
                  <div key={label} className="flex items-center gap-2 text-xs font-bold text-ink-soft">
                    <span className={`block h-8 w-8 border border-line bg-green-pale ${radius}`} />
                    {label}
                  </div>
                ))}
              </div>
            </Example>
          </div>
        </CatalogSection>

        <CatalogSection
          id="actions"
          eyebrow="02 · Actions"
          title="Make the next action obvious."
          description="Every supported Button appearance is rendered below: four variants, three sizes, enabled, loading, disabled, full-width, and icon-led use. Every screen still gets only one clear primary action."
        >
          <div className="space-y-4">
            {BUTTON_SIZES.map((size) => (
              <Example
                key={size}
                title={`Button · ${size}`}
                note="Each row renders its normal, loading, and disabled state."
              >
                <div className="overflow-x-auto">
                  <div className="min-w-[620px] space-y-2">
                    <div className="grid grid-cols-[110px_repeat(3,minmax(150px,1fr))] items-center gap-3 border-b border-line-soft pb-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">
                      <span>Variant</span>
                      <span>Ready</span>
                      <span>Loading</span>
                      <span>Disabled</span>
                    </div>
                    {BUTTON_VARIANTS.map((variant) => (
                      <div key={variant} className="grid grid-cols-[110px_repeat(3,minmax(150px,1fr))] items-center gap-3 py-1">
                        <code className="text-xs font-bold text-accent-cinnamon">{variant}</code>
                        <Button variant={variant} size={size}>Save recipe</Button>
                        <Button variant={variant} size={size} loading>Saving</Button>
                        <Button variant={variant} size={size} disabled>Unavailable</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Example>
            ))}
            <div className="grid gap-4 lg:grid-cols-2">
              <Example title="Full-width action · every variant" note="Use in narrow forms and single-action mobile sheets.">
                <div className="space-y-2">
                  {BUTTON_VARIANTS.map((variant) => (
                    <Button key={variant} fullWidth variant={variant} size="sm">{variant} action</Button>
                  ))}
                </div>
              </Example>
              <Example title="Icon-led action" note="Icons support a text label; they do not replace it in ordinary actions.">
                <Button><Pencil size={16} /> Edit recipe</Button>
              </Example>
            </div>
          </div>
        </CatalogSection>

        <CatalogSection
          id="forms"
          eyebrow="03 · Forms"
          title="Labels first, guidance when it helps."
          description="Every visual field state is represented here. Use the primitives for their label connection, validation announcement, focus treatment, and mobile-friendly sizing; do not hand-style ordinary fields."
        >
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Example title="Input · standard, hint, required">
                <div className="space-y-5">
                  <Input label="Recipe title" placeholder="e.g. Sunday roast chicken" />
                  <Input label="Source URL" type="url" placeholder="https://…" hint="Optional — save it for later." />
                  <Input label="Email address" type="email" required placeholder="you@example.com" />
                </div>
              </Example>
              <Example title="Input · adornment, error, disabled">
                <div className="space-y-5">
                  <Input label="Private key" type="password" defaultValue="not-a-real-key" rightElement={<Eye size={17} className="text-ink-soft" />} />
                  <Input label="Recipe title" placeholder="Give this recipe a name" error="A recipe title is required." />
                  <Input label="Cookbook owner" defaultValue="Rosa Martinez" disabled />
                </div>
              </Example>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Example title="Textarea · standard, hint, required">
                <div className="space-y-5">
                  <Textarea label="The story behind it" defaultValue="Grandma made this whenever the whole family came over." hint="A few sentences are plenty." />
                  <Textarea label="Cooking notes" required placeholder="What should the next cook know?" />
                </div>
              </Example>
              <Example title="Textarea · error and disabled">
                <div className="space-y-5">
                  <Textarea label="Instructions" placeholder="Write the first step" error="Add at least one instruction." />
                  <Textarea label="Original memory" defaultValue="Saved from a family note." disabled />
                </div>
              </Example>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Example title="Select · default, hint, required">
                <div className="space-y-5">
                  <Select label="Cookbook" defaultValue="family">
                    <option value="family">The Family Table</option>
                    <option value="weeknight">Weeknight Dinners</option>
                    <option value="grandma">Grandma&apos;s Classics</option>
                  </Select>
                  <Select label="Recipe category" required defaultValue="" hint="You can change this later.">
                    <option value="" disabled>Choose a category…</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="dinner">Dinner</option>
                  </Select>
                </div>
              </Example>
              <Example title="Select · error, disabled, compact label">
                <div className="space-y-5">
                  <Select label="Cookbook" defaultValue="" error="Choose a cookbook before saving.">
                    <option value="" disabled>Choose a cookbook…</option>
                    <option value="family">The Family Table</option>
                  </Select>
                  <Select label="Recipe visibility" defaultValue="family" disabled>
                    <option value="family">Shared with family</option>
                  </Select>
                  <Select label="Move recipes into" labelClassName="text-xs font-bold uppercase tracking-wide text-ink-soft" defaultValue="dinner" className="min-h-11 text-sm">
                    <option value="dinner">Dinner</option>
                    <option value="dessert">Desserts</option>
                  </Select>
                </div>
              </Example>
            </div>
          </div>
        </CatalogSection>

        <CatalogSection
          id="feedback"
          eyebrow="04 · Feedback"
          title="Give context without breaking the flow."
          description="Every shared feedback treatment is rendered below: all badge variants, reaction states, both empty-state shapes, and the title/no-title Dialog and eyebrow/no-eyebrow Drawer permutations."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Example title="Badge · every variant">
              <div className="flex flex-wrap gap-2">
                {BADGE_VARIANTS.map((variant) => (
                  <Badge key={variant} variant={variant}>{variant}</Badge>
                ))}
              </div>
            </Example>
            <Example title="ReactionPill · every reaction and state" note="Tap one to inspect its pressed state and count behavior.">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <ReactionPill type="love" />
                  <ReactionPill type="made_it" count={4} />
                  <ReactionPill type="favorite" count={9} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <ReactionPill type="love" count={12} initialActive />
                  <ReactionPill type="made_it" count={2} initialActive />
                  <ReactionPill type="favorite" count={1} initialActive />
                </div>
              </div>
            </Example>
            <Example title="Dialog and Drawer · every chrome permutation" note="Choose Dialog for a decision; choose Drawer for a side task.">
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" size="sm" onClick={() => setDialogMode("decision")}>
                  Dialog with title
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDialogMode("utility")}>
                  Dialog without title
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setDrawerWithEyebrow(true); setDrawerOpen(true); }}>
                  Drawer with eyebrow
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setDrawerWithEyebrow(false); setDrawerOpen(true); }}>
                  Drawer without eyebrow
                </Button>
              </div>
            </Example>
            <Example title="EmptyState · complete">
              <EmptyState
                icon={<BookOpen size={28} strokeWidth={1.5} className="text-green-sage" />}
                title="No recipes here yet"
                description="Start with a handwritten favorite your family already loves."
                action={<Button size="sm">Add a recipe <ChevronRight size={15} /></Button>}
              />
            </Example>
            <Example title="EmptyState · minimal">
              <EmptyState title="Nothing saved yet" />
            </Example>
          </div>
        </CatalogSection>

        <CatalogSection
          id="surfaces"
          eyebrow="05 · Content surfaces"
          title="Warm containers, intentional emphasis."
          description="All Card, SectionHeader, RecipeCard, and RecipeStoryNote appearances are shown here. Interactive surfaces should look and behave interactive; static cards should remain quiet."
        >
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Example title="Card · default padded">
                <Card>
                  <CardHeader>
                    <SectionHeader title="A note from the kitchen" subtitle="Static grouped content" />
                  </CardHeader>
                  <CardBody>
                    Add the recipe details people need most, then keep the next action close by.
                  </CardBody>
                  <div className="mt-5"><Button variant="ghost" size="sm">Read the note <ChevronRight size={15} /></Button></div>
                </Card>
              </Example>
              <Example title="Card · muted and unpadded">
                <div className="space-y-3">
                  <Card muted>
                    <SectionHeader title="Muted card" subtitle="For lower-emphasis grouped content" />
                  </Card>
                  <Card padded={false}>
                    <div className="p-4">
                      <p className="text-sm font-bold text-green-deep">Unpadded card</p>
                      <p className="mt-1 text-sm text-ink-muted">The composition owns its spacing.</p>
                    </div>
                  </Card>
                  <Card muted padded={false}>
                    <div className="p-4 text-sm font-bold text-green-deep">Muted, unpadded card</div>
                  </Card>
                </div>
              </Example>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Example title="SectionHeader · standard">
                <SectionHeader title="Ingredients" subtitle="Everything you need" />
              </Example>
              <Example title="SectionHeader · with action">
                <SectionHeader title="Recipes" subtitle="12 saved" action={<Button size="sm" variant="secondary">View all</Button>} />
              </Example>
              <Example title="SectionHeader · decorative">
                <SectionHeader title="From Grandma&apos;s kitchen" decorative />
              </Example>
              <Example title="SectionHeader · decorative with context">
                <SectionHeader title="Summer recipes" subtitle="Made for the porch table" decorative action={<Button size="sm" variant="ghost">See all</Button>} />
              </Example>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Example title="RecipeCard · complete">
                <RecipeCard
                  title="Apple Pie"
                  description="Flaky crust, cinnamon apples, and the kind of smell that fills the house."
                  imageUrl="/images/recipes/apple-pie.png"
                  fromPerson="Rosa"
                  cookTime="1 hr 20 min"
                  servings={8}
                  loveCount={12}
                  category="Dessert"
                  isFavorited
                  onClick={() => {}}
                />
              </Example>
              <Example title="RecipeCard · fallback image and minimal metadata">
                <RecipeCard title="Weeknight Soup" category="Dinner" onClick={() => {}} />
              </Example>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Example title="RecipeStoryNote · with author">
                <RecipeStoryNote story="This was always the first thing to disappear at Sunday dinner." author="Grandma Rosa" />
              </Example>
              <Example title="RecipeStoryNote · story only">
                <RecipeStoryNote story="Double the lemon if the family is coming over." />
              </Example>
            </div>
          </div>
        </CatalogSection>

        <CatalogSection
          id="identity"
          eyebrow="06 · Identity and people"
          title="Every shared identity treatment, in one place."
          description="The brand mark, all supported cookbook icons and cover colors, plus every avatar-stack configuration are rendered below. The cookbook cover grid intentionally shows the entire allowed palette."
        >
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Example title="BrandLockup · default">
                <BrandLockup />
              </Example>
              <Example title="BrandLockup · compact">
                <BrandLockup compact />
              </Example>
            </div>
            <Example title="BookCoverArt · every allowed cover color">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
                {BOOK_COVER_COLORS.map((color) => (
                  <div key={color.hex} className="min-w-0 text-center">
                    <BookCoverArt title="Family Table" seed={color.label} color={color.hex} className="mx-auto w-16" />
                    <p className="mt-1 truncate text-[10px] font-bold text-ink-soft">{color.label}</p>
                  </div>
                ))}
              </div>
            </Example>
            <Example title="CookbookIcon · every supported name">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9">
                {cookbookIconCatalog.map((icon) => (
                  <div key={icon.id} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-line-soft bg-white-soft/55 p-2">
                    <CookbookIcon name={icon.id} size={22} />
                    <span className="text-[10px] font-bold text-ink-soft">{icon.label}</span>
                  </div>
                ))}
              </div>
            </Example>
            <div className="grid gap-4 lg:grid-cols-3">
              <Example title="MemberAvatarStack · small">
                <MemberAvatarStack members={SAMPLE_MEMBERS.slice(0, 3)} size="sm" />
              </Example>
              <Example title="MemberAvatarStack · default overflow">
                <MemberAvatarStack members={SAMPLE_MEMBERS} />
              </Example>
              <Example title="MemberAvatarStack · invite action">
                <MemberAvatarStack members={SAMPLE_MEMBERS.slice(0, 2)} showAddButton onAddMember={() => {}} />
              </Example>
            </div>
          </div>
        </CatalogSection>

        <CatalogSection
          id="navigation"
          eyebrow="07 · Navigation"
          title="Compact navigation states without guesswork."
          description="BottomNav has five mutually exclusive active states. Select every tab below to view its actual active treatment; the centered Add control is intentionally distinct."
        >
          <Example title={`BottomNav · active ${activeNav}`} note="All five tab controls are shown together because that is how the component is used in the product.">
            <div className="relative h-24 overflow-hidden rounded-lg border border-line-soft bg-paper-warm/40">
              <BottomNav active={activeNav} onNavigate={setActiveNav} className="!absolute" />
            </div>
          </Example>
        </CatalogSection>

        <CatalogSection
          id="inventory"
          eyebrow="Reference inventory"
          title="The contract developers and AI follow."
          description="This table is generated from the typed library registry. The source file, visual catalog, and usage guidance should change together whenever a primitive changes."
        >
          <div className="overflow-hidden rounded-xl border border-line-soft bg-card/75 shadow-xs">
            <div className="hidden grid-cols-[minmax(120px,0.55fr)_minmax(0,1.25fr)_minmax(180px,0.9fr)] gap-5 border-b border-line-soft bg-white-soft/50 px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft sm:grid">
              <span>Primitive</span>
              <span>Use it when</span>
              <span>Source</span>
            </div>
            <div className="divide-y divide-line-soft">
              {UI_LIBRARY.map((item) => (
                <div key={item.name} className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(120px,0.55fr)_minmax(0,1.25fr)_minmax(180px,0.9fr)] sm:gap-5">
                  <p className="font-bold text-green-deep">{item.importName}</p>
                  <p className="text-sm leading-relaxed text-ink-muted">{item.useWhen}</p>
                  <code className="text-xs leading-relaxed text-accent-cinnamon">{item.source}</code>
                </div>
              ))}
            </div>
          </div>
        </CatalogSection>

        <footer className="pb-8 text-center text-sm text-ink-soft">
          Need a pattern that is not here? Start with <code className="rounded bg-card-muted px-1.5 py-0.5 text-xs text-green-deep">src/components/ui/README.md</code> before creating a new primitive.
        </footer>
      </div>

      <Dialog
        open={dialogMode !== null}
        onClose={() => setDialogMode(null)}
        title={dialogMode === "decision" ? "Remove this recipe?" : undefined}
        ariaLabel={dialogMode === "utility" ? "Recipe quick actions" : undefined}
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {dialogMode === "decision"
            ? "This is the confirmation pattern for a consequential action. Explain what will happen, then make the safe option easy to choose."
            : "This is the titleless utility dialog. Its accessible name is supplied with ariaLabel when the visible task content makes a heading redundant."}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={() => setDialogMode(null)}>
            {dialogMode === "decision" ? "Keep recipe" : "Close"}
          </Button>
          {dialogMode === "decision" && (
            <Button variant="danger" size="sm" onClick={() => setDialogMode(null)}>Remove recipe</Button>
          )}
        </div>
      </Dialog>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        eyebrow={drawerWithEyebrow ? "Recipe details" : undefined}
        title="Share this recipe"
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          A drawer keeps a related task close to its source without forcing someone away from the current page.
        </p>
        <div className="mt-6 space-y-3">
          <Button fullWidth size="sm"><Heart size={15} /> Invite family</Button>
          <Button fullWidth variant="secondary" size="sm" onClick={() => setDrawerOpen(false)}>Done</Button>
        </div>
      </Drawer>
    </main>
  );
}
