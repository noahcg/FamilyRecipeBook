"use client";

import { useEffect, useState } from "react";

const HEADLINES = {
  breakfast: "Breakfast, ready.",
  lunch: "Lunch, handled.",
  dinner: "Dinner, sorted.",
  lateNight: "Late night, covered.",
} as const;

function getTimeOfDayHeadline(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return HEADLINES.breakfast;
  if (hour >= 11 && hour < 16) return HEADLINES.lunch;
  if (hour >= 16 && hour < 22) return HEADLINES.dinner;
  return HEADLINES.lateNight;
}

export function TimeOfDayHeadline() {
  const [headline, setHeadline] = useState<string>(HEADLINES.dinner);

  useEffect(() => {
    setHeadline(getTimeOfDayHeadline());
  }, []);

  return (
    <h1
      className="mt-2 text-5xl font-bold leading-none text-green-deep sm:text-6xl lg:text-7xl"
      style={{ fontFamily: "var(--font-playfair)" }}
    >
      {headline}
    </h1>
  );
}
