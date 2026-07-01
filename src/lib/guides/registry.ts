// Contextual mini-guides ("coachmarks").
//
// Each guide is a short, opt-in walkthrough anchored to a real on-screen
// control. A pulsing beacon sits on the guide's first anchor; tapping it runs
// the steps in a card popover. Once finished/skipped the guide id is recorded
// in user_settings.seen_guides and the beacon disappears.
//
// To add or change a guide: edit this file only. Anchors are matched against
// elements carrying `data-guide-anchor="<anchorId>"`. Keep the image list below
// in sync with the captures in /public/guides — this registry is the single
// checklist of screenshots to (re)shoot when the relevant UI changes.

export interface GuideStepImage {
  /** Path under /public, e.g. "/guides/invite-members-1.webp". */
  src: string;
  /**
   * Conveys the instruction for screen-reader users, since the highlight in the
   * screenshot is purely visual.
   */
  alt: string;
}

export interface GuideStep {
  /** Element marked with data-guide-anchor to spotlight/position against. */
  anchorId: string;
  title: string;
  body: string;
  /** Optional annotated screenshot shown at the top of the step card. */
  image?: GuideStepImage;
  /**
   * If set, "Next" navigates here before the next step (used when a guide spans
   * two screens, e.g. invite → Members page).
   */
  nextHref?: (ctx: GuideContext) => string;
}

export interface Guide {
  id: string;
  /** Spoken label for the beacon button. */
  beaconLabel: string;
  /** Only consider this guide on routes where this returns true. */
  routeMatch: (pathname: string) => boolean;
  /**
   * Guide ids that must be seen before this guide's beacon appears. Lets a guide
   * reveal progressively instead of all at once — e.g. the Meal Plan hint waits
   * until the user has been through the add-a-recipe guide.
   */
  prerequisites?: string[];
  steps: GuideStep[];
}

/** Values pulled from the current URL so step hrefs can be book-aware. */
export interface GuideContext {
  bookId: string | null;
}

export function getGuideContext(pathname: string): GuideContext {
  const bookId = pathname.match(/^\/app\/books\/([^/]+)/)?.[1] ?? null;
  return { bookId };
}

export const GUIDES: Guide[] = [
  {
    id: "invite-members",
    beaconLabel: "Tip: how to invite family to this cookbook",
    routeMatch: (p) => /^\/app\/books\/[^/]+/.test(p),
    steps: [
      {
        anchorId: "manage-members",
        title: "Invite your family",
        body: "Cooking with others? Open Manage Members to share this cookbook so everyone can add recipes, notes, and memories.",
        image: {
          src: "/guides/invite-members-1.webp",
          alt: "The cookbook toolbar with the Manage Members button highlighted.",
        },
        nextHref: ({ bookId }) => `/app/books/${bookId}/members`,
      },
      {
        anchorId: "add-someone",
        title: "Add someone by email",
        body: "Tap Add Someone, enter their email, and pick a role — Contributor (can add and edit recipes) or Family (can view, react, and add notes). They get an email invite.",
        image: {
          src: "/guides/invite-members-2.webp",
          alt: "The Members page with the Add Someone button highlighted.",
        },
      },
    ],
  },
  {
    id: "add-recipe",
    beaconLabel: "Tip: how to add a recipe",
    // The account-level My Recipes page and any cookbook's recipes page both
    // carry an "Add Recipe" button (data-guide-anchor="add-recipe").
    routeMatch: (p) => p === "/app/recipes" || /^\/app\/books\/[^/]+\/recipes/.test(p),
    steps: [
      {
        anchorId: "add-recipe",
        title: "Add your first recipe",
        body: "Add a recipe by hand, snap a photo of a recipe card, or paste text and we'll format it for you.",
        image: {
          src: "/guides/add-recipe-1.webp",
          alt: "The cookbook toolbar with the Add Recipe button highlighted.",
        },
      },
    ],
  },
  {
    id: "nav-orientation",
    beaconLabel: "Tip: finding your way around",
    routeMatch: (p) => p === "/app",
    steps: [
      {
        anchorId: "nav-bookshelf",
        title: "Your cookbooks live here",
        body: "Open the Bookshelf to switch between cookbooks or start a new one. Everything else — recipes, meal plan, groceries, favorites — is in the main menu.",
        image: {
          src: "/guides/nav-orientation-1.webp",
          alt: "The navigation with the Bookshelf entry highlighted.",
        },
      },
    ],
  },
  {
    id: "plan-and-shop",
    beaconLabel: "Tip: plan meals and build a grocery list",
    // Anchored to the global Meal Plan / Groceries nav items, so the hint is
    // discoverable from anywhere — not only once the user is already on the
    // Meal Plan page. Gated below so it only reveals after add-a-recipe.
    routeMatch: (p) => p.startsWith("/app"),
    prerequisites: ["add-recipe"],
    steps: [
      {
        anchorId: "nav-meal-plan",
        title: "Plan your week",
        body: "Add recipes to days in your Meal Plan to map out the week.",
        image: {
          src: "/guides/plan-and-shop-1.webp",
          alt: "The navigation with the Meal Plan entry highlighted.",
        },
      },
      {
        anchorId: "nav-groceries",
        title: "Your grocery list builds itself",
        body: "Groceries gathers the ingredients from everything you planned, so your shopping list is ready without retyping.",
        image: {
          src: "/guides/plan-and-shop-2.webp",
          alt: "The navigation with the Groceries entry highlighted.",
        },
      },
    ],
  },
];
