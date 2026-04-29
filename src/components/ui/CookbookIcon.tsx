import {
  BookOpen,
  CakeSlice,
  CookingPot,
  EggFried,
  Gift,
  HandHeart,
  Heart,
  House,
  Leaf,
  Moon,
  NotebookPen,
  Salad,
  Soup,
  Star,
  UtensilsCrossed,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";

const ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  bowl: Soup,
  holiday: Gift,
  quick: Zap,
  dinner: UtensilsCrossed,
  grandma: Heart,
  weeknight: Moon,
  salad: Salad,
  dessert: CakeSlice,
  comfort: HandHeart,
  cooking: CookingPot,
  breakfast: EggFried,
  leaf: Leaf,
  home: House,
  wheat: Wheat,
  note: NotebookPen,
  favorite: Star,
};

const LEGACY_EMOJI_TO_ICON: Record<string, string> = {
  "\u{1F4D6}": "book",
  "\u{1F384}": "holiday",
  "\u{26A1}": "quick",
  "\u{1F37D}\uFE0F": "dinner",
  "\u2764\uFE0F": "grandma",
  "\u2665": "grandma",
  "\u{1F319}": "weeknight",
  "\u{1F957}": "salad",
  "\u{1F370}": "dessert",
  "\u{1F958}": "cooking",
  "\u{1F373}": "breakfast",
  "\u{1F963}": "bowl",
  "\u{1F372}": "comfort",
  "\u{1F9E4}": "comfort",
  "\u{1F944}": "dessert",
  "\u{1F33F}": "leaf",
  "\u{1F345}": "cooking",
  "\u{1F4DD}": "note",
  "\u2605": "favorite",
};

export function normalizeCookbookIcon(icon?: string | null, fallback = "book") {
  if (!icon) return fallback;
  return LEGACY_EMOJI_TO_ICON[icon] ?? icon;
}

interface CookbookIconProps {
  name?: string | null;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function CookbookIcon({
  name,
  className,
  size = 22,
  strokeWidth = 1.75,
}: CookbookIconProps) {
  const iconName = normalizeCookbookIcon(name);
  const Icon = ICONS[iconName] ?? ICONS.book;

  return (
    <Icon
      aria-hidden="true"
      className={clsx("text-green-deep", className)}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}

export const cookbookIconOptions = [
  { id: "book", label: "Book" },
  { id: "holiday", label: "Holiday" },
  { id: "quick", label: "Quick" },
  { id: "dinner", label: "Dinner" },
  { id: "grandma", label: "Family" },
  { id: "weeknight", label: "Weeknight" },
  { id: "salad", label: "Fresh" },
  { id: "dessert", label: "Dessert" },
  { id: "cooking", label: "Cooking" },
  { id: "breakfast", label: "Breakfast" },
];
