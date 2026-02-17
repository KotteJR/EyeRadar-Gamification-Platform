// PixelLab-powered shop items — Characters, Backgrounds, Effects
// Replaces the old DiceBear avatar system

export type ShopCategory = "characters" | "backgrounds" | "effects";

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  cost: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  /** Path to the preview sprite (south-facing idle) */
  preview: string;
  /** For characters: folder with sprite files */
  assetFolder?: string;
  /** Whether this is the default (free, always owned) */
  isDefault?: boolean;
}

// ── Characters ────────────────────────────────────────────
// Each character has sprites in: /game-assets/characters/{id}/
// Files: idle.png, attack/ (frames), slide/ (frames), run/ (frames)

export const SHOP_CHARACTERS: ShopItem[] = [
  {
    id: "wizard",
    name: "Wizard",
    category: "characters",
    cost: 0,
    rarity: "common",
    description: "The classic blue-robed wizard. Your starting hero!",
    preview: "/game-assets/player/idle.png",
    assetFolder: "/game-assets/player",
    isDefault: true,
  },
  {
    id: "knight",
    name: "Knight",
    category: "characters",
    cost: 200,
    rarity: "rare",
    description: "Silver-armored warrior with sword and shield.",
    preview: "/game-assets/characters/knight/idle.png",
    assetFolder: "/game-assets/characters/knight",
  },
  {
    id: "rogue",
    name: "Rogue",
    category: "characters",
    cost: 250,
    rarity: "rare",
    description: "Shadowy assassin with dual daggers.",
    preview: "/game-assets/characters/rogue/idle.png",
    assetFolder: "/game-assets/characters/rogue",
  },
  {
    id: "ranger",
    name: "Ranger",
    category: "characters",
    cost: 250,
    rarity: "rare",
    description: "Forest archer with deadly aim.",
    preview: "/game-assets/characters/ranger/idle.png",
    assetFolder: "/game-assets/characters/ranger",
  },
  {
    id: "necromancer",
    name: "Necromancer",
    category: "characters",
    cost: 400,
    rarity: "epic",
    description: "Dark mage who commands undead forces.",
    preview: "/game-assets/characters/necromancer/idle.png",
    assetFolder: "/game-assets/characters/necromancer",
  },
  {
    id: "paladin",
    name: "Paladin",
    category: "characters",
    cost: 400,
    rarity: "epic",
    description: "Holy warrior wreathed in divine light.",
    preview: "/game-assets/characters/paladin/idle.png",
    assetFolder: "/game-assets/characters/paladin",
  },
  {
    id: "viking",
    name: "Viking",
    category: "characters",
    cost: 500,
    rarity: "epic",
    description: "Fierce norse warrior with battle axe.",
    preview: "/game-assets/characters/viking/idle.png",
    assetFolder: "/game-assets/characters/viking",
  },
  {
    id: "samurai",
    name: "Samurai",
    category: "characters",
    cost: 600,
    rarity: "legendary",
    description: "Honorable katana master from the east.",
    preview: "/game-assets/characters/samurai/idle.png",
    assetFolder: "/game-assets/characters/samurai",
  },
  {
    id: "druid",
    name: "Druid",
    category: "characters",
    cost: 500,
    rarity: "epic",
    description: "Nature mage with antler crown and vine staff.",
    preview: "/game-assets/characters/druid/idle.png",
    assetFolder: "/game-assets/characters/druid",
  },
];

// ── Backgrounds ───────────────────────────────────────────

export const SHOP_BACKGROUNDS: ShopItem[] = [
  {
    id: "bg_grassland",
    name: "Grassland",
    category: "backgrounds",
    cost: 0,
    rarity: "common",
    description: "Peaceful green meadows. The default battlefield.",
    preview: "/game-assets/backgrounds/grassland.png",
    isDefault: true,
  },
  {
    id: "bg_forest",
    name: "Dark Forest",
    category: "backgrounds",
    cost: 100,
    rarity: "common",
    description: "Mysterious forest with ancient trees.",
    preview: "/game-assets/backgrounds/forest.png",
  },
  {
    id: "bg_mountain",
    name: "Mountain Pass",
    category: "backgrounds",
    cost: 150,
    rarity: "rare",
    description: "Rocky mountain terrain with snow peaks.",
    preview: "/game-assets/backgrounds/mountain.png",
  },
  {
    id: "bg_sunset",
    name: "Sunset Valley",
    category: "backgrounds",
    cost: 200,
    rarity: "rare",
    description: "Golden hour over a beautiful valley.",
    preview: "/game-assets/backgrounds/sunset.png",
  },
  {
    id: "bg_night",
    name: "Moonlit Night",
    category: "backgrounds",
    cost: 250,
    rarity: "epic",
    description: "Battle under the stars and moonlight.",
    preview: "/game-assets/backgrounds/night.png",
  },
  {
    id: "bg_cloud_kingdom",
    name: "Cloud Kingdom",
    category: "backgrounds",
    cost: 400,
    rarity: "legendary",
    description: "A mystical kingdom above the clouds.",
    preview: "/game-assets/backgrounds/cloud_kingdom.png",
  },
];

// ── Effects ───────────────────────────────────────────────

export const SHOP_EFFECTS: ShopItem[] = [
  {
    id: "fx_default",
    name: "Energy Bolt",
    category: "effects",
    cost: 0,
    rarity: "common",
    description: "Basic blue energy projectile. Default attack.",
    preview: "/game-assets/effects/fireball/frame_0.png",
    isDefault: true,
  },
  {
    id: "fx_fireball",
    name: "Fireball",
    category: "effects",
    cost: 150,
    rarity: "rare",
    description: "A blazing fireball with flame trail.",
    preview: "/game-assets/effects/fireball/frame_0.png",
    assetFolder: "/game-assets/effects/fireball",
  },
  {
    id: "fx_tornado",
    name: "Tornado",
    category: "effects",
    cost: 200,
    rarity: "rare",
    description: "A swirling wind tornado that devastates enemies.",
    preview: "/game-assets/effects/tornado/frame_0.png",
    assetFolder: "/game-assets/effects/tornado",
  },
  {
    id: "fx_ice",
    name: "Ice Crystal",
    category: "effects",
    cost: 250,
    rarity: "epic",
    description: "Frozen shards that pierce through armor.",
    preview: "/game-assets/effects/ice/frame_0.png",
    assetFolder: "/game-assets/effects/ice",
  },
  {
    id: "fx_poison",
    name: "Poison Cloud",
    category: "effects",
    cost: 200,
    rarity: "rare",
    description: "Toxic green gas that melts everything.",
    preview: "/game-assets/effects/poison/frame_0.png",
    assetFolder: "/game-assets/effects/poison",
  },
  {
    id: "fx_magic",
    name: "Arcane Orb",
    category: "effects",
    cost: 300,
    rarity: "epic",
    description: "Pure arcane energy in a swirling purple orb.",
    preview: "/game-assets/effects/magic/frame_0.png",
    assetFolder: "/game-assets/effects/magic",
  },
];

// ── Combined ──────────────────────────────────────────────

export const ALL_SHOP_ITEMS: ShopItem[] = [
  ...SHOP_CHARACTERS,
  ...SHOP_BACKGROUNDS,
  ...SHOP_EFFECTS,
];

export const RARITY_COLORS: Record<ShopItem["rarity"], string> = {
  common: "#94a3b8",
  rare: "#3b82f6",
  epic: "#8b5cf6",
  legendary: "#f59e0b",
};

export const RARITY_BG: Record<ShopItem["rarity"], string> = {
  common: "bg-slate-100",
  rare: "bg-blue-50",
  epic: "bg-purple-50",
  legendary: "bg-amber-50",
};

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  characters: "Characters",
  backgrounds: "Backgrounds",
  effects: "Attack Effects",
};

export function getShopItem(id: string): ShopItem | undefined {
  return ALL_SHOP_ITEMS.find((i) => i.id === id);
}
