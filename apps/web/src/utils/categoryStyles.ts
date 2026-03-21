/** Hero row label aligned to category (matches marketing copy in mock). */
export function categoryHeroLabel(category: string): string {
  const c = category.trim();
  const m: Record<string, string> = {
    Food: "Food & Culture",
    Comedy: "Trending in Comedy",
    Music: "New in Music",
    Fashion: "Featured in Fashion",
    Lifestyle: "Lifestyle Spotlight",
    Sports: "Sports Spotlight",
  };
  return m[c] ?? `Featured in ${c}`;
}

/** Category accent for hero chips / tags (brief semantic colors). */
export function categoryHeroChipBg(category: string): string {
  const c = category.toLowerCase();
  if (c === "food") return "#22c55e";
  if (c === "comedy") return "#f97316";
  if (c === "music") return "#3b82f6";
  if (c === "lifestyle") return "#a855f7";
  if (c === "sports") return "#ec4899";
  if (c === "fashion") return "#facc15";
  return "#f97316";
}
