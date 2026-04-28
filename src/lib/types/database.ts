export type BookRole = "keeper" | "contributor" | "family";
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
  category: string | null;
  tags: string[];
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

export interface Collection {
  id: string;
  book_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionRecipe {
  id: string;
  collection_id: string;
  recipe_id: string;
  created_at: string;
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
