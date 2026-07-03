// Welcome tour ("coachmark" walkthrough).
//
// A single, one-time guided tour shown to new users from a dismissible card on
// the home screen. Tapping "Show me around" runs these steps back-to-back in a
// card popover; each step spotlights a real on-screen control (matched by
// `data-guide-anchor="<anchorId>"`). Every anchor below lives in the app nav, so
// the whole tour runs on the home screen with no page navigation. Once taken or
// skipped, WELCOME_TOUR_ID is recorded in user_settings.seen_guides and the card
// never returns (replayable from Settings → "Replay the welcome tour").
//
// To change the tour: edit this file only. Keep the image list in sync with the
// captures in /public/guides — this is the checklist of screenshots to (re)shoot
// when the relevant UI changes.

/** Seen-guides key that tracks whether the welcome tour has been taken/skipped. */
export const WELCOME_TOUR_ID = "welcome-tour";

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
}

export const WELCOME_TOUR_STEPS: GuideStep[] = [
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
];
