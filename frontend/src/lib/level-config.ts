// ─── Level / World Theme Configuration ────────────────────────────────────────
// Maps each deficit area (world) to a unique visual theme with PixelLab-ready
// descriptions and CSS fallback gradients for immediate use.

import type { DeficitArea } from "@/types";

export type WorldTheme =
  | "grassland"
  | "forest"
  | "mountain"
  | "sunset"
  | "night"
  | "cloud_kingdom";

export interface WorldThemeConfig {
  id: WorldTheme;
  name: string;
  subtitle: string;
  pixellab_bg_description: string;
  pixellab_tileset: {
    lower: string;
    transition: string;
  };
  sky: { top: string; mid: string; bottom: string };
  mountains: { far: string; mid: string; near: string };
  ground: { grass: string; earth: string; brick: string };
  clouds: boolean;
  stars: boolean;
  specialEffect?: "fireflies" | "snowflakes" | "embers" | "sparkles";
  gameWorldVariant: "day" | "night" | "underground" | "castle";
}

export const WORLD_THEMES: Record<WorldTheme, WorldThemeConfig> = {
  grassland: {
    id: "grassland",
    name: "Emerald Meadows",
    subtitle: "A peaceful beginning",
    pixellab_bg_description:
      "sidescroller background, rolling green hills, blue sky, fluffy clouds, distant mountains, golden hour, dreamy pastoral, soft colors, studio ghibli style",
    pixellab_tileset: {
      lower: "lush green grass earth",
      transition: "wildflowers and soft grass",
    },
    sky: { top: "#87CEEB", mid: "#B0E2FF", bottom: "#E0F4FF" },
    mountains: { far: "#7CB342", mid: "#66BB6A", near: "#43A047" },
    ground: { grass: "#4CAF50", earth: "#8D6E31", brick: "#6B5220" },
    clouds: true,
    stars: false,
    gameWorldVariant: "day",
  },
  forest: {
    id: "forest",
    name: "Whispering Woods",
    subtitle: "Ancient trees guard secrets",
    pixellab_bg_description:
      "sidescroller forest background, tall trees, dappled sunlight, misty depth, mushrooms, magical woodland, soft greens, enchanted forest",
    pixellab_tileset: {
      lower: "dark forest soil with roots",
      transition: "moss and ferns",
    },
    sky: { top: "#2D5A27", mid: "#3D7A37", bottom: "#5A9A4A" },
    mountains: { far: "#1B4D1B", mid: "#2E7D32", near: "#388E3C" },
    ground: { grass: "#33691E", earth: "#4E342E", brick: "#3E2723" },
    clouds: false,
    stars: false,
    specialEffect: "fireflies",
    gameWorldVariant: "day",
  },
  mountain: {
    id: "mountain",
    name: "Crystal Peaks",
    subtitle: "Where eagles dare to fly",
    pixellab_bg_description:
      "sidescroller mountain background, snow peaks, alpine meadows, crisp blue sky, distant valleys, majestic landscape, epic scale",
    pixellab_tileset: {
      lower: "grey mountain stone",
      transition: "snow and ice crystals",
    },
    sky: { top: "#1E3A5F", mid: "#4A90C4", bottom: "#89CFF0" },
    mountains: { far: "#546E7A", mid: "#78909C", near: "#90A4AE" },
    ground: { grass: "#78909C", earth: "#546E7A", brick: "#455A64" },
    clouds: true,
    stars: false,
    specialEffect: "snowflakes",
    gameWorldVariant: "day",
  },
  sunset: {
    id: "sunset",
    name: "Amber Vale",
    subtitle: "Where the sun paints the sky",
    pixellab_bg_description:
      "sidescroller sunset background, orange pink sky, silhouette hills, warm golden light, peaceful evening, dreamy clouds, studio ghibli",
    pixellab_tileset: {
      lower: "warm orange sandstone",
      transition: "golden wheat and dry grass",
    },
    sky: { top: "#FF6B35", mid: "#FF8E6B", bottom: "#FFB199" },
    mountains: { far: "#C2185B", mid: "#AD1457", near: "#880E4F" },
    ground: { grass: "#BF360C", earth: "#8D6E63", brick: "#6D4C41" },
    clouds: true,
    stars: false,
    specialEffect: "embers",
    gameWorldVariant: "day",
  },
  night: {
    id: "night",
    name: "Starlight Domain",
    subtitle: "The cosmos reveals all",
    pixellab_bg_description:
      "sidescroller night background, starry sky, crescent moon, sleeping hills, soft blue tones, magical nighttime, peaceful, aurora borealis",
    pixellab_tileset: {
      lower: "dark blue-grey stone",
      transition: "glowing mushrooms and moonflowers",
    },
    sky: { top: "#0A0E27", mid: "#141B3D", bottom: "#1B2838" },
    mountains: { far: "#1A237E", mid: "#283593", near: "#303F9F" },
    ground: { grass: "#1B5E20", earth: "#1A1A2E", brick: "#0D1B2A" },
    clouds: false,
    stars: true,
    gameWorldVariant: "night",
  },
  cloud_kingdom: {
    id: "cloud_kingdom",
    name: "Cloud Kingdom",
    subtitle: "Above the world, beyond limits",
    pixellab_bg_description:
      "sidescroller sky background, floating clouds, heavenly light, soft pastels, dreamy atmosphere, above the clouds, magical kingdom in sky",
    pixellab_tileset: {
      lower: "fluffy white cloud material",
      transition: "golden light and rainbow shimmer",
    },
    sky: { top: "#E8D5F5", mid: "#F0E6FF", bottom: "#FFF5F5" },
    mountains: { far: "#C7B8EA", mid: "#D4C5F9", near: "#E8D5F5" },
    ground: { grass: "#E8D5F5", earth: "#D4C5F9", brick: "#C7B8EA" },
    clouds: true,
    stars: false,
    specialEffect: "sparkles",
    gameWorldVariant: "castle",
  },
};

// Map deficit areas to world themes
export const DEFICIT_AREA_THEME: Record<DeficitArea, WorldTheme> = {
  phonological_awareness: "grassland",
  rapid_naming: "forest",
  working_memory: "mountain",
  visual_processing: "sunset",
  reading_fluency: "night",
  comprehension: "cloud_kingdom",
};

// Helper to get theme for a deficit area
export function getWorldTheme(area: DeficitArea): WorldThemeConfig {
  return WORLD_THEMES[DEFICIT_AREA_THEME[area]];
}

// Check if PixelLab-generated background exists
export function getPixelLabBackground(theme: WorldTheme): string | null {
  // These paths correspond to where the generation script saves images
  const path = `/game-assets/backgrounds/${theme}.png`;
  return path;
}

// Check if PixelLab-generated boss sprite exists
export function getPixelLabBoss(bossId: string): string | null {
  const path = `/game-assets/bosses/${bossId}.png`;
  return path;
}
