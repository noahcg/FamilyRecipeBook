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
    id: "add-recipe",
    beaconLabel: "Tip: find and add your recipes",
    // Anchored to the global My Recipes nav item (data-guide-anchor="nav-my-recipes")
    // so this is the first beacon a new user meets — visible from anywhere on
    // both desktop and mobile. Both steps stay put on the nav item (no
    // navigation on "Next"); the images preview the My Recipes and New Recipe
    // screens the user will reach once they open it.
    routeMatch: (p) => p.startsWith("/app"),
    steps: [
      {
        anchorId: "nav-my-recipes",
        title: "Find all your recipes here",
        body: "My Recipes gathers everything you've added across your cookbooks in one place. Open it to see your collection.",
        image: {
          src: "/guides/my-recipes-1.webp",
          alt: "The My Recipes page listing recipes grouped into chapters.",
        },
      },
      {
        anchorId: "nav-my-recipes",
        title: "Add your first recipe",
        body: "In My Recipes, tap Add Recipe to add one by hand, snap a photo of a recipe card, or paste text and we'll format it for you.",
        image: {
          src: "/guides/add-recipe-1.webp",
          alt: "The cookbook toolbar with the Add Recipe button highlighted.",
        },
      },
    ],
  },
  {
    id: "nav-orientation",
    beaconLabel: "Tip: cookbooks and sharing with family",
    routeMatch: (p) => p === "/app",
    // Second in the onboarding chain: reveal the Bookshelf dot only after the
    // user has met the My Recipes beacon, so the home screen shows one dot at a
    // time rather than My Recipes and Bookshelf competing at once.
    prerequisites: ["add-recipe"],
    // Multi-step: orient the user to cookbooks, then fold in the family-invite
    // walkthrough (previously its own beacon on the Manage Members button, since
    // removed). Every step stays on the Bookshelf nav item — no navigation on
    // "Next"; the images preview the screens each action leads to.
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
      {
        anchorId: "nav-bookshelf",
        title: "Invite your family",
        body: "Cooking with others? Open a cookbook and use Manage Members to share it, so everyone can add recipes, notes, and memories.",
        image: {
          src: "/guides/invite-members-1.webp",
          alt: "The cookbook toolbar with the Manage Members button highlighted.",
        },
      },
      {
        anchorId: "nav-bookshelf",
        title: "Add someone by email",
        body: "Inside Manage Members, tap Add Someone, enter their email, and pick a role — Contributor (can add and edit recipes) or Family (can view, react, and add notes). They get an email invite.",
        image: {
          src: "/guides/invite-members-2.webp",
          alt: "The Members page with the Add Someone button highlighted.",
        },
      },
    ],
  },
  {
    id: "plan-and-shop",
    beaconLabel: "Tip: plan meals and build a grocery list",
    // Anchored to the global Meal Plan / Groceries nav items, so the hint is
    // discoverable from anywhere — not only once the user is already on the
    // Meal Plan page. Last in the chain: reveals after nav-orientation (which
    // itself waits on add-recipe), so the dots surface one at a time.
    routeMatch: (p) => p.startsWith("/app"),
    prerequisites: ["nav-orientation"],
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
