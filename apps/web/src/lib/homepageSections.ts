/** Keys must match backend `app/homepage_sections.py` HOMEPAGE_SECTION_KEYS. */

export const HOMEPAGE_SECTION_IDS = [
  "featured_creators",
  "trending",
  "new_releases",
  "comedy",
  "music",
  "lifestyle",
  "free_to_watch",
] as const;

export type HomepageSectionId = (typeof HOMEPAGE_SECTION_IDS)[number];

export type HomepageSectionsState = Record<HomepageSectionId, boolean>;

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionsState = {
  featured_creators: true,
  trending: true,
  new_releases: true,
  comedy: true,
  music: true,
  lifestyle: true,
  free_to_watch: true,
};

export const HOMEPAGE_SECTION_LABELS: Record<HomepageSectionId, string> = {
  featured_creators: "Featured Creators",
  trending: "Trending This Week",
  new_releases: "New Releases",
  comedy: "Comedy",
  music: "Music",
  lifestyle: "Lifestyle",
  free_to_watch: "Free to Watch",
};

export function mergeHomepageSections(
  partial: Partial<Record<string, boolean>> | undefined | null
): HomepageSectionsState {
  const out: HomepageSectionsState = { ...DEFAULT_HOMEPAGE_SECTIONS };
  if (!partial || typeof partial !== "object") return out;
  for (const id of HOMEPAGE_SECTION_IDS) {
    if (typeof partial[id] === "boolean") {
      out[id] = partial[id]!;
    }
  }
  return out;
}
