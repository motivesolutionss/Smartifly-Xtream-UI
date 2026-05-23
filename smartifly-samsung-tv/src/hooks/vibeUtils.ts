/**
 * Returns a themed color based on content metadata (category, genre, title).
 * Optimized for Tizen performance (pure string matching, no canvas/extraction).
 * Prioritizes Category Name from server to ensure broad consistency.
 */
export const getAtmosphereColor = (
  title: string = "", 
  genre: string = "", 
  categoryName: string = ""
): string => {
  const t = title.toLowerCase();
  const g = genre.toLowerCase();
  const c = categoryName.toLowerCase();

  // Combine for matching
  const context = `${c} ${g} ${t}`;

  // 1. Sci-Fi/Tech - Subtle Blue (High Priority)
  if (context.includes("sci-fi") || context.includes("science") || context.includes("space") || context.includes("robot") || context.includes("future")) {
    return "rgba(0, 209, 255, 0.08)";
  }

  // 2. Fantasy/Animation - Subtle Purple (High Priority)
  if (context.includes("fantasy") || context.includes("animation") || context.includes("anime") || context.includes("cartoon")) {
    return "rgba(186, 0, 255, 0.08)";
  }

  // 3. Mystery/Crime/Thriller - Subtle Teal/Cyan
  if (context.includes("mystery") || context.includes("crime") || context.includes("thriller") || context.includes("detective") || context.includes("suspense")) {
    return "rgba(0, 180, 216, 0.09)";
  }

  // 4. Nature/Documentary - Subtle Green
  if (context.includes("documentary") || context.includes("nature") || context.includes("earth") || context.includes("wild") || context.includes("animal")) {
    return "rgba(0, 255, 133, 0.07)";
  }

  // 5. Action/Horror - Subtle Red
  if (context.includes("action") || context.includes("horror") || context.includes("war") || context.includes("dead") || context.includes("fight")) {
    return "rgba(229, 9, 20, 0.08)";
  }

  // 6. Romance/Drama - Subtle Rose/Pink
  if (context.includes("romance") || context.includes("drama") || context.includes("love") || context.includes("heart") || context.includes("emotional")) {
    return "rgba(255, 0, 127, 0.07)";
  }

  // 7. Comedy/Family - Subtle Orange
  if (context.includes("comedy") || context.includes("family") || context.includes("kids") || context.includes("funny")) {
    return "rgba(255, 165, 0, 0.07)";
  }

  // 8. History/Western/Biography - Subtle Gold/Bronze
  if (context.includes("history") || context.includes("biography") || context.includes("western") || context.includes("king") || context.includes("period")) {
    return "rgba(212, 175, 55, 0.07)";
  }

  // 9. Music/Musical - Subtle Magenta
  if (context.includes("music") || context.includes("musical") || context.includes("song") || context.includes("concert")) {
    return "rgba(255, 0, 255, 0.07)";
  }

  // Default Cinematic Blue/Dark
  return "rgba(40, 100, 255, 0.07)";
};
