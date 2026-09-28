"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { EditorialGuide } from "@/lib/guides/editorial";

const display = { fontFamily: "var(--font-playfair)" };

export function GuideTableOfContents({ guide }: { guide: EditorialGuide }) {
  const links = [
    ...guide.sections.map((section) => ({ id: section.id, label: section.heading })),
    { id: "home-cooked", label: "How Home Cooked Helps" },
  ];
  const sectionKey = links.map(({ id }) => id).join("|");
  const [activeId, setActiveId] = useState(links[0].id);

  useEffect(() => {
    const sectionIds = sectionKey.split("|");
    let frame = 0;

    const updateActiveSection = () => {
      const threshold = Math.min(180, window.innerHeight * 0.24);
      let current = sectionIds[0];

      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= threshold) current = id;
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        current = sectionIds[sectionIds.length - 1];
      }

      setActiveId((previous) => previous === current ? previous : current);
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sectionKey]);

  return (
    <aside className="lg:sticky lg:top-5 lg:self-start" aria-label="In this guide">
      <details open className="bg-transparent lg:min-h-[46rem] lg:open:block">
        <summary className="flex min-h-20 list-none items-center px-5 text-[1.65rem] font-bold text-green-deep marker:hidden sm:px-6" style={display}>In This Guide</summary>
        <nav className="pb-5" aria-label="Guide sections">
          <ol>
            {links.map(({ id, label }) => {
              const active = activeId === id;
              return (
                <li key={id} className={`group relative border-l-2 transition-colors duration-200 ${active ? "border-green-deep bg-green-sage/25" : "border-transparent hover:border-green-sage/70"}`}>
                  {active && <span aria-hidden="true" className="absolute -left-[5px] top-1/2 size-2 -translate-y-1/2 rounded-full bg-green-deep" />}
                  <a
                    href={`#${id}`}
                    aria-current={active ? "location" : undefined}
                    onClick={() => setActiveId(id)}
                    className={`block min-h-12 px-5 py-3 text-[.98rem] leading-snug transition-[background-color,color,padding] duration-200 hover:px-7 hover:text-green-deep focus-visible:text-green-deep sm:px-6 sm:hover:px-8 ${active ? "font-bold text-green-deep hover:bg-green-sage/35 focus-visible:bg-green-sage/35" : "text-ink-muted hover:bg-green-sage/20 focus-visible:bg-green-sage/20"}`}
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="hidden px-8 pb-10 pt-16 lg:block">
          <p className="rotate-[-3deg] font-hand text-[1.75rem] leading-[1.1] text-green-deep">Good<br />Recipes<br />Brighter<br />Days</p>
          <Heart aria-hidden="true" className="ml-24 mt-3 text-accent-terracotta" size={23} strokeWidth={1.7} />
        </div>
      </details>
    </aside>
  );
}
