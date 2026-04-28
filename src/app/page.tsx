"use client";

import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardBody,
  RecipeCard,
  RecipeStoryNote,
  ReactionBar,
  BookCover,
  BottomNav,
  SectionHeader,
  MemberAvatarStack,
  EmptyState,
} from "@/components/ui";
import { Plus, Leaf } from "lucide-react";

const SAMPLE_MEMBERS = [
  { id: "1", name: "Grandma Rose", initials: "GR" },
  { id: "2", name: "Mom", initials: "MO" },
  { id: "3", name: "Aunt Carol", initials: "AC" },
  { id: "4", name: "Uncle Jim", initials: "UJ" },
  { id: "5", name: "Sarah", initials: "SA" },
];

export default function DesignSystemPreview() {
  return (
    <div className="app-paper-bg paper-texture">
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30 border-b border-line-soft px-5 py-4 flex items-center justify-between"
        style={{ background: "rgba(247,243,233,0.9)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-2">
          <Leaf size={18} strokeWidth={1.75} className="text-green-sage" />
          <h1
            className="text-green-deep font-bold text-lg"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Family Recipe Book
          </h1>
        </div>
        <MemberAvatarStack
          members={SAMPLE_MEMBERS}
          maxVisible={3}
          size="sm"
          showAddButton
          onAddMember={() => {}}
        />
      </header>

      <main className="max-w-[760px] mx-auto px-5 pb-28 pt-8 space-y-12 relative z-10">

        {/* ── Color Palette ── */}
        <section>
          <SectionHeader title="Color Tokens" decorative className="mb-4" />
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[
              { name: "paper", hex: "#F7F3E9" },
              { name: "paper-warm", hex: "#F2E8D8" },
              { name: "card", hex: "#FFF9EE" },
              { name: "border", hex: "#D8CBB7" },
              { name: "deep-green", hex: "#2F4F3F" },
              { name: "sage", hex: "#8BA888" },
              { name: "sage-soft", hex: "#DDE7D7" },
              { name: "sage-pale", hex: "#EEF4EA" },
              { name: "terracotta", hex: "#E76F51" },
              { name: "terracotta-dark", hex: "#B95A40" },
              { name: "mustard", hex: "#F2B348" },
              { name: "honey", hex: "#D8A053" },
              { name: "cinnamon", hex: "#8D5E34" },
              { name: "clay", hex: "#B8754B" },
              { name: "ink", hex: "#26362E" },
              { name: "ink-muted", hex: "#6E6255" },
            ].map((c) => (
              <div key={c.name} className="flex flex-col gap-1 items-center">
                <div
                  className="w-10 h-10 rounded-lg border border-line-soft shadow-xs"
                  style={{ background: c.hex }}
                />
                <span className="text-xs text-ink-soft text-center leading-tight">{c.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Typography ── */}
        <section>
          <SectionHeader title="Typography" decorative className="mb-4" />
          <Card>
            <div className="space-y-4">
              <p
                className="text-green-deep leading-tight"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "var(--text-3xl)" }}
              >
                Grandma&rsquo;s Sunday Pot Roast
              </p>
              <p
                className="text-green-deep italic leading-tight"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "var(--text-xl)" }}
              >
                The recipe that started everything.
              </p>
              <p
                className="text-ink leading-relaxed"
                style={{ fontFamily: "var(--font-nunito)", fontSize: "var(--text-base)" }}
              >
                Every Sunday, without fail, the whole family gathered around that big oak table.
                The smell of the roast meant everyone was coming home.
              </p>
              <p
                className="text-ink-muted"
                style={{ fontFamily: "var(--font-nunito)", fontSize: "var(--text-sm)" }}
              >
                Recently added · Family favorites · 4 servings
              </p>
              <p
                style={{
                  fontFamily: "var(--font-caveat)",
                  fontSize: "var(--text-lg)",
                  color: "var(--color-cinnamon)",
                }}
              >
                &ldquo;I always add a little extra thyme&rdquo; — Grandma Rose
              </p>
            </div>
          </Card>
        </section>

        {/* ── Buttons ── */}
        <section>
          <SectionHeader title="Buttons" decorative className="mb-4" />
          <Card>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Add to this book</Button>
              <Button variant="secondary">View recipe</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Remove</Button>
              <Button variant="primary" loading>Saving…</Button>
              <Button variant="primary" fullWidth className="mt-2">
                <Plus size={16} /> Add a recipe
              </Button>
            </div>
          </Card>
        </section>

        {/* ── Inputs ── */}
        <section>
          <SectionHeader title="Inputs" decorative className="mb-4" />
          <Card>
            <div className="space-y-4">
              <Input
                label="Recipe title"
                placeholder="e.g. Grandma's Pot Roast"
              />
              <Input
                label="Who is this from?"
                placeholder="e.g. Grandma Rose"
                hint="The name that will appear on the recipe card."
              />
              <Input
                label="Email address"
                placeholder="family@example.com"
                error="Please enter a valid email address."
              />
              <Textarea
                label="The story behind this recipe"
                placeholder="Add a note or memory…"
                hint="This will appear at the top of the recipe page."
              />
            </div>
          </Card>
        </section>

        {/* ── Recipe Cards ── */}
        <section>
          <SectionHeader
            title="Recently added"
            decorative
            action={<Button variant="ghost" size="sm">See all</Button>}
            className="mb-4"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <RecipeCard
              title="Grandma's Pot Roast"
              description="Slow-braised with root vegetables and fresh herbs. Sunday dinner at its finest."
              fromPerson="Grandma Rose"
              cookTime="3 hrs"
              servings={6}
              loveCount={12}
              category="Dinners"
              imageUrl="https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop"
              onClick={() => {}}
            />
            <RecipeCard
              title="Blueberry Pancakes"
              description="Fluffy, golden, and packed with fresh blueberries. A family weekend tradition."
              fromPerson="Mom"
              cookTime="25 min"
              servings={4}
              loveCount={8}
              category="Breakfast"
              onClick={() => {}}
            />
            <RecipeCard
              title="Apple Pie"
              description="Classic double-crust pie with cinnamon-spiced filling. Grandma's pride and joy."
              fromPerson="Aunt Carol"
              cookTime="1 hr 15 min"
              servings={8}
              loveCount={21}
              category="Desserts"
              imageUrl="https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=300&fit=crop"
              onClick={() => {}}
            />
          </div>
        </section>

        {/* ── Story Note ── */}
        <section>
          <SectionHeader title="Recipe Story Note" decorative className="mb-4" />
          <RecipeStoryNote
            story="This was the dish she made every time someone came home from being away too long. I've never tasted anything quite like it since."
            author="Grandma Rose, 1987"
          />
        </section>

        {/* ── Reactions ── */}
        <section>
          <SectionHeader title="Reactions" decorative className="mb-4" />
          <Card>
            <ReactionBar recipeLoves={12} recipeMadeIts={4} recipeFavorites={7} />
          </Card>
        </section>

        {/* ── Book Covers ── */}
        <section>
          <SectionHeader title="Book Covers" decorative className="mb-4" />
          <div className="flex flex-wrap gap-5">
            <BookCover
              title="The Family Table"
              subtitle="Our heirloom cookbook"
              style="sage"
              recipeCount={34}
              memberCount={7}
            />
            <BookCover
              title="Holiday Recipes"
              subtitle="Thanksgiving & Christmas"
              style="terracotta"
              recipeCount={18}
              memberCount={4}
            />
            <BookCover
              title="Mom's Recipe Box"
              style="mustard"
              recipeCount={52}
              memberCount={3}
              imageUrl="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=520&fit=crop"
            />
            <BookCover
              title="Sunday Dinners"
              style="clay"
              recipeCount={11}
              memberCount={5}
              size="sm"
            />
          </div>
        </section>

        {/* ── Member Avatar Stack ── */}
        <section>
          <SectionHeader title="Member Avatar Stack" decorative className="mb-4" />
          <Card>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-ink-muted mb-2">5 members, show 4</p>
                <MemberAvatarStack
                  members={SAMPLE_MEMBERS}
                  maxVisible={4}
                  showAddButton
                  onAddMember={() => {}}
                />
              </div>
              <div>
                <p className="text-sm text-ink-muted mb-2">Small size</p>
                <MemberAvatarStack members={SAMPLE_MEMBERS.slice(0, 3)} size="sm" />
              </div>
            </div>
          </Card>
        </section>

        {/* ── Empty State ── */}
        <section>
          <SectionHeader title="Empty State" decorative className="mb-4" />
          <Card>
            <EmptyState
              title="No recipes yet"
              description="Add your first recipe to this book. It could be something from memory or a family favourite passed down over the years."
              action={
                <Button variant="primary">
                  <Plus size={16} /> Add a recipe
                </Button>
              }
            />
          </Card>
        </section>

        {/* ── Generic Cards ── */}
        <section>
          <SectionHeader title="Cards" decorative className="mb-4" />
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <h3
                  className="font-bold text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Family favorites
                </h3>
              </CardHeader>
              <CardBody>
                Recipes that every member has reacted to or added to their favorites.
              </CardBody>
            </Card>
            <Card muted>
              <CardHeader>
                <h3 className="font-semibold text-ink">Muted card variant</h3>
              </CardHeader>
              <CardBody>Used for secondary information or nested content.</CardBody>
            </Card>
          </div>
        </section>

      </main>

      <BottomNav active="home" />
    </div>
  );
}
