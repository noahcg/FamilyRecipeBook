export type BookRole = "keeper" | "contributor" | "family";
export type HouseholdRole = "owner" | "member";
export type MealSlot = "breakfast" | "lunch" | "dinner";
export type ReactionType = "love" | "made_it" | "favorite";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  known_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeBook {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  cover_style: string;
  icon: string;
  sharing_enabled: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface BookMember {
  id: string;
  book_id: string;
  user_id: string;
  role: BookRole;
  created_at: string;
}

export interface BookInvitation {
  id: string;
  book_id: string;
  email: string;
  role: Exclude<BookRole, "keeper">;
  token: string;
  invited_by: string;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface Recipe {
  id: string;
  book_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  source_name: string | null;
  story: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  category_id: string | null;
  /**
   * Populated when the fetching query joins `category:book_categories(id, name)`.
   * Unjoined SELECTs leave this undefined — read sites that need the name must
   * include the join.
   */
  category: { id: string; name: string } | null;
  tags: string[];
  import_method: "image_upload" | "file_import" | null;
  source_url: string | null;
  import_source: string | null;
  import_metadata: Record<string, unknown>;
  nutrition: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  position: number;
  quantity: string | null;
  unit: string | null;
  item: string;
  note: string | null;
  group_label: string | null;
  created_at: string;
}

export interface RecipeInstruction {
  id: string;
  recipe_id: string;
  position: number;
  body: string;
  created_at: string;
}

export interface RecipeStory {
  id: string;
  recipe_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface RecipeReaction {
  id: string;
  recipe_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

export interface RecipeRating {
  id: string;
  recipe_id: string;
  user_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  book_id: string;
  recipe_id: string | null;
  actor_id: string | null;
  type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AIProvider = "openai" | "anthropic";

export interface UserSettings {
  user_id: string;
  ai_provider: AIProvider | null;
  ai_api_key: string | null;
  default_book_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  created_at: string;
}

export interface MealPlan {
  id: string;
  household_id: string;
  recipe_id: string | null;
  planned_date: string;
  meal_slot: MealSlot;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroceryItem {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: string;
  aisle: string | null;
  sort_order: number | null;
  notes: string | null;
  recipe_id: string | null;
  // Full weekday names this item was planned for (meal-plan import, opt-in).
  // Optional: absent when the 015 migration hasn't been applied.
  meal_days?: string[] | null;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  created_by: string;
  created_at: string;
}

/* ─── Joined/enriched types used in the app ─────────────────── */

export interface RecipeWithRelations extends Recipe {
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  stories: (RecipeStory & { author: Profile })[];
  reactions: RecipeReaction[];
  creator: Profile;
}

export interface BookWithMembers extends RecipeBook {
  members: (BookMember & { profile: Profile })[];
  owner: Profile;
}

export interface MemberWithProfile extends BookMember {
  profile: Profile;
}

export interface ReactionCounts {
  love: number;
  made_it: number;
  favorite: number;
}

export interface UserReactions {
  love: boolean;
  made_it: boolean;
  favorite: boolean;
}

export interface RecipeRatingSummary {
  average: number;
  count: number;
  userRating: number;
}
