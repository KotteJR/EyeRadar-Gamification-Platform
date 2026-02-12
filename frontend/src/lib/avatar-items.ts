// Avatar customization items purchasable with points
// Maps to DiceBear Avataaars style options

export type AvatarCategory = "clothing" | "top" | "accessories" | "eyes" | "mouth" | "skinColor" | "hairColor" | "clothesColor" | "hatColor";

export interface AvatarItem {
  id: string;
  name: string;
  category: AvatarCategory;
  /** The DiceBear option value this item sets */
  optionKey: string;
  optionValue: string;
  /** Extra options this item sets (e.g. color) */
  extraOptions?: Record<string, string[]>;
  cost: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  /** Preview string for shop display */
  preview: string;
}

// ─── Shop Items ────────────────────────────────────────────────────────────────

export const AVATAR_ITEMS: AvatarItem[] = [
  // ─── Clothing ────────────────────────────────────────────────────────────
  { id: "cloth_hoodie", name: "Cozy Hoodie", category: "clothing", optionKey: "clothing", optionValue: "hoodie", cost: 30, rarity: "common", description: "Warm and comfy hoodie", preview: "🧥" },
  { id: "cloth_blazer_shirt", name: "Blazer & Shirt", category: "clothing", optionKey: "clothing", optionValue: "blazerAndShirt", cost: 80, rarity: "rare", description: "Smart business casual", preview: "👔" },
  { id: "cloth_blazer_sweater", name: "Blazer & Sweater", category: "clothing", optionKey: "clothing", optionValue: "blazerAndSweater", cost: 100, rarity: "rare", description: "Layered and stylish", preview: "🧥" },
  { id: "cloth_collar_sweater", name: "Collar Sweater", category: "clothing", optionKey: "clothing", optionValue: "collarAndSweater", cost: 60, rarity: "common", description: "Classy collar look", preview: "👕" },
  { id: "cloth_graphic", name: "Graphic Tee", category: "clothing", optionKey: "clothing", optionValue: "graphicShirt", cost: 50, rarity: "common", description: "Show off your style", preview: "👕" },
  { id: "cloth_overall", name: "Cool Overall", category: "clothing", optionKey: "clothing", optionValue: "overall", cost: 70, rarity: "common", description: "Adventure-ready overalls", preview: "🥋" },
  { id: "cloth_crew", name: "Crew Neck", category: "clothing", optionKey: "clothing", optionValue: "shirtCrewNeck", cost: 25, rarity: "common", description: "Simple and clean", preview: "👕" },
  { id: "cloth_scoop", name: "Scoop Neck", category: "clothing", optionKey: "clothing", optionValue: "shirtScoopNeck", cost: 25, rarity: "common", description: "Casual scoop neck", preview: "👕" },
  { id: "cloth_vneck", name: "V-Neck Shirt", category: "clothing", optionKey: "clothing", optionValue: "shirtVNeck", cost: 25, rarity: "common", description: "Relaxed v-neck look", preview: "👕" },

  // ─── Clothing Colors ─────────────────────────────────────────────────────
  { id: "ccolor_red", name: "Red Outfit", category: "clothesColor", optionKey: "clothesColor", optionValue: "ff5c5c", cost: 40, rarity: "common", description: "Fiery red clothing", preview: "🔴" },
  { id: "ccolor_blue", name: "Ocean Blue Outfit", category: "clothesColor", optionKey: "clothesColor", optionValue: "65c9ff", cost: 40, rarity: "common", description: "Cool ocean blue", preview: "🔵" },
  { id: "ccolor_green", name: "Mint Green Outfit", category: "clothesColor", optionKey: "clothesColor", optionValue: "a7ffc4", cost: 50, rarity: "common", description: "Fresh mint green", preview: "🟢" },
  { id: "ccolor_pink", name: "Pink Outfit", category: "clothesColor", optionKey: "clothesColor", optionValue: "ff488e", cost: 60, rarity: "rare", description: "Bold pink style", preview: "🩷" },
  { id: "ccolor_gold", name: "Golden Outfit", category: "clothesColor", optionKey: "clothesColor", optionValue: "ffdeb5", cost: 150, rarity: "epic", description: "Shimmering gold", preview: "🟡" },
  { id: "ccolor_dark", name: "Dark Outfit", category: "clothesColor", optionKey: "clothesColor", optionValue: "262e33", cost: 50, rarity: "common", description: "Sleek dark style", preview: "⚫" },
  { id: "ccolor_purple", name: "Purple Outfit", category: "clothesColor", optionKey: "clothesColor", optionValue: "929598", cost: 60, rarity: "rare", description: "Royal purple vibes", preview: "🟣" },

  // ─── Hairstyles (Top) ────────────────────────────────────────────────────
  { id: "top_short_flat", name: "Short & Flat", category: "top", optionKey: "top", optionValue: "shortFlat", cost: 0, rarity: "common", description: "Clean short haircut", preview: "💇" },
  { id: "top_short_curly", name: "Short Curly", category: "top", optionKey: "top", optionValue: "shortCurly", cost: 30, rarity: "common", description: "Bouncy short curls", preview: "🌀" },
  { id: "top_bob", name: "Bob Cut", category: "top", optionKey: "top", optionValue: "bob", cost: 40, rarity: "common", description: "Classic bob hairstyle", preview: "💇‍♀️" },
  { id: "top_curly", name: "Long Curly", category: "top", optionKey: "top", optionValue: "curly", cost: 50, rarity: "common", description: "Beautiful flowing curls", preview: "🌊" },
  { id: "top_bun", name: "Hair Bun", category: "top", optionKey: "top", optionValue: "bun", cost: 40, rarity: "common", description: "Neat bun style", preview: "🎀" },
  { id: "top_big_hair", name: "Big Hair", category: "top", optionKey: "top", optionValue: "bigHair", cost: 60, rarity: "rare", description: "Go big or go home!", preview: "🦁" },
  { id: "top_dreads", name: "Dreads", category: "top", optionKey: "top", optionValue: "dreads", cost: 70, rarity: "rare", description: "Cool dreadlocks", preview: "🎵" },
  { id: "top_frizzle", name: "Frizzle", category: "top", optionKey: "top", optionValue: "frizzle", cost: 50, rarity: "common", description: "Wild and free", preview: "⚡" },
  { id: "top_fro", name: "Afro", category: "top", optionKey: "top", optionValue: "fro", cost: 60, rarity: "rare", description: "Iconic afro style", preview: "🟤" },
  { id: "top_shaggy", name: "Shaggy", category: "top", optionKey: "top", optionValue: "shaggy", cost: 40, rarity: "common", description: "Laid back shaggy look", preview: "🐕" },
  { id: "top_caesar", name: "The Caesar", category: "top", optionKey: "top", optionValue: "theCaesar", cost: 80, rarity: "rare", description: "The imperial cut", preview: "🏛️" },

  // ─── Hats (also in top) ──────────────────────────────────────────────────
  { id: "top_hat", name: "Classic Hat", category: "top", optionKey: "top", optionValue: "hat", cost: 100, rarity: "rare", description: "A nice hat", preview: "🎩" },
  { id: "top_hijab", name: "Hijab", category: "top", optionKey: "top", optionValue: "hijab", cost: 80, rarity: "rare", description: "Beautiful hijab", preview: "🧕" },
  { id: "top_turban", name: "Turban", category: "top", optionKey: "top", optionValue: "turban", cost: 100, rarity: "rare", description: "Elegant turban", preview: "👳" },
  { id: "top_winter1", name: "Winter Beanie", category: "top", optionKey: "top", optionValue: "winterHat1", cost: 120, rarity: "rare", description: "Cozy winter beanie", preview: "🧶" },
  { id: "top_winter2", name: "Pom Pom Hat", category: "top", optionKey: "top", optionValue: "winterHat02", cost: 150, rarity: "epic", description: "Cute pom pom beanie", preview: "⛄" },
  { id: "top_winter3", name: "Ear Flap Hat", category: "top", optionKey: "top", optionValue: "winterHat03", cost: 150, rarity: "epic", description: "Warm ear flap hat", preview: "🏔️" },
  { id: "top_winter4", name: "Snow Cap", category: "top", optionKey: "top", optionValue: "winterHat04", cost: 200, rarity: "epic", description: "Epic snow cap", preview: "❄️" },

  // ─── Hat Colors ──────────────────────────────────────────────────────────
  { id: "hcolor_blue", name: "Blue Hat", category: "hatColor", optionKey: "hatColor", optionValue: "65c9ff", cost: 40, rarity: "common", description: "Cool blue hat", preview: "🔵" },
  { id: "hcolor_red", name: "Red Hat", category: "hatColor", optionKey: "hatColor", optionValue: "ff5c5c", cost: 40, rarity: "common", description: "Fiery red hat", preview: "🔴" },
  { id: "hcolor_pink", name: "Pink Hat", category: "hatColor", optionKey: "hatColor", optionValue: "ffafb9", cost: 50, rarity: "rare", description: "Pretty pink hat", preview: "🩷" },
  { id: "hcolor_green", name: "Green Hat", category: "hatColor", optionKey: "hatColor", optionValue: "a7ffc4", cost: 50, rarity: "rare", description: "Fresh green hat", preview: "🟢" },
  { id: "hcolor_gold", name: "Golden Hat", category: "hatColor", optionKey: "hatColor", optionValue: "ffdeb5", cost: 200, rarity: "legendary", description: "Golden crown headwear", preview: "🟡" },

  // ─── Accessories ─────────────────────────────────────────────────────────
  { id: "acc_prescription1", name: "Reading Glasses", category: "accessories", optionKey: "accessories", optionValue: "prescription01", cost: 50, rarity: "common", description: "Smart reading glasses", preview: "👓" },
  { id: "acc_prescription2", name: "Square Glasses", category: "accessories", optionKey: "accessories", optionValue: "prescription02", cost: 60, rarity: "common", description: "Trendy square frames", preview: "👓" },
  { id: "acc_sunglasses", name: "Sunglasses", category: "accessories", optionKey: "accessories", optionValue: "sunglasses", cost: 80, rarity: "rare", description: "Cool shades", preview: "🕶️" },
  { id: "acc_wayfarers", name: "Wayfarers", category: "accessories", optionKey: "accessories", optionValue: "wayfarers", cost: 100, rarity: "rare", description: "Classic wayfarer style", preview: "🕶️" },
  { id: "acc_round", name: "Round Glasses", category: "accessories", optionKey: "accessories", optionValue: "round", cost: 70, rarity: "common", description: "Retro round frames", preview: "👓" },
  { id: "acc_kurt", name: "Kurt Shades", category: "accessories", optionKey: "accessories", optionValue: "kurt", cost: 120, rarity: "epic", description: "Legendary rock star shades", preview: "🤘" },
  { id: "acc_eyepatch", name: "Eye Patch", category: "accessories", optionKey: "accessories", optionValue: "eyepatch", cost: 200, rarity: "epic", description: "Arrr, pirate style!", preview: "🏴‍☠️" },

  // ─── Eyes ────────────────────────────────────────────────────────────────
  { id: "eyes_default", name: "Normal Eyes", category: "eyes", optionKey: "eyes", optionValue: "default", cost: 0, rarity: "common", description: "Standard friendly eyes", preview: "👀" },
  { id: "eyes_happy", name: "Happy Eyes", category: "eyes", optionKey: "eyes", optionValue: "happy", cost: 30, rarity: "common", description: "Always smiling!", preview: "😊" },
  { id: "eyes_hearts", name: "Heart Eyes", category: "eyes", optionKey: "eyes", optionValue: "hearts", cost: 100, rarity: "rare", description: "Full of love!", preview: "😍" },
  { id: "eyes_wink", name: "Wink", category: "eyes", optionKey: "eyes", optionValue: "wink", cost: 60, rarity: "common", description: "Cheeky wink", preview: "😉" },
  { id: "eyes_surprised", name: "Surprised", category: "eyes", optionKey: "eyes", optionValue: "surprised", cost: 40, rarity: "common", description: "Wide open surprise!", preview: "😲" },
  { id: "eyes_squint", name: "Squint", category: "eyes", optionKey: "eyes", optionValue: "squint", cost: 50, rarity: "common", description: "Focused squint look", preview: "😑" },
  { id: "eyes_stars", name: "Star Struck", category: "eyes", optionKey: "eyes", optionValue: "winkWacky", cost: 150, rarity: "epic", description: "One eye bigger than the other!", preview: "🤪" },

  // ─── Mouth ───────────────────────────────────────────────────────────────
  { id: "mouth_smile", name: "Big Smile", category: "mouth", optionKey: "mouth", optionValue: "smile", cost: 0, rarity: "common", description: "A warm smile", preview: "😄" },
  { id: "mouth_twinkle", name: "Twinkle Smile", category: "mouth", optionKey: "mouth", optionValue: "twinkle", cost: 30, rarity: "common", description: "A cute twinkle", preview: "😊" },
  { id: "mouth_tongue", name: "Tongue Out", category: "mouth", optionKey: "mouth", optionValue: "tongue", cost: 50, rarity: "common", description: "Playful tongue out", preview: "😛" },
  { id: "mouth_eating", name: "Eating", category: "mouth", optionKey: "mouth", optionValue: "eating", cost: 60, rarity: "rare", description: "Nom nom nom!", preview: "😋" },
  { id: "mouth_grimace", name: "Grimace", category: "mouth", optionKey: "mouth", optionValue: "grimace", cost: 40, rarity: "common", description: "A grimacing face", preview: "😬" },
  { id: "mouth_serious", name: "Serious", category: "mouth", optionKey: "mouth", optionValue: "serious", cost: 30, rarity: "common", description: "All business", preview: "😐" },

  // ─── Skin Colors ─────────────────────────────────────────────────────────
  { id: "skin_light", name: "Light Skin", category: "skinColor", optionKey: "skinColor", optionValue: "ffdbb4", cost: 0, rarity: "common", description: "Light skin tone", preview: "🟡" },
  { id: "skin_medium", name: "Medium Skin", category: "skinColor", optionKey: "skinColor", optionValue: "edb98a", cost: 0, rarity: "common", description: "Medium skin tone", preview: "🟠" },
  { id: "skin_tan", name: "Tan Skin", category: "skinColor", optionKey: "skinColor", optionValue: "d08b5b", cost: 0, rarity: "common", description: "Tan skin tone", preview: "🤎" },
  { id: "skin_brown", name: "Brown Skin", category: "skinColor", optionKey: "skinColor", optionValue: "ae5d29", cost: 0, rarity: "common", description: "Brown skin tone", preview: "🟤" },
  { id: "skin_dark", name: "Dark Skin", category: "skinColor", optionKey: "skinColor", optionValue: "614335", cost: 0, rarity: "common", description: "Dark skin tone", preview: "⬛" },
  { id: "skin_yellow", name: "Yellow Skin", category: "skinColor", optionKey: "skinColor", optionValue: "f8d25c", cost: 0, rarity: "common", description: "Classic yellow", preview: "💛" },

  // ─── Hair Colors ─────────────────────────────────────────────────────────
  { id: "hair_black", name: "Black Hair", category: "hairColor", optionKey: "hairColor", optionValue: "2c1b18", cost: 0, rarity: "common", description: "Classic black hair", preview: "⬛" },
  { id: "hair_brown", name: "Brown Hair", category: "hairColor", optionKey: "hairColor", optionValue: "724133", cost: 0, rarity: "common", description: "Natural brown", preview: "🟤" },
  { id: "hair_blonde", name: "Blonde Hair", category: "hairColor", optionKey: "hairColor", optionValue: "d6b370", cost: 20, rarity: "common", description: "Sunny blonde", preview: "🟡" },
  { id: "hair_auburn", name: "Auburn Hair", category: "hairColor", optionKey: "hairColor", optionValue: "a55728", cost: 30, rarity: "common", description: "Rich auburn", preview: "🟠" },
  { id: "hair_red", name: "Red Hair", category: "hairColor", optionKey: "hairColor", optionValue: "c93305", cost: 50, rarity: "rare", description: "Fiery red hair", preview: "🔴" },
  { id: "hair_platinum", name: "Platinum Hair", category: "hairColor", optionKey: "hairColor", optionValue: "e8e1e1", cost: 80, rarity: "rare", description: "Platinum silver", preview: "⬜" },
  { id: "hair_strawberry", name: "Strawberry", category: "hairColor", optionKey: "hairColor", optionValue: "f59797", cost: 100, rarity: "epic", description: "Strawberry pink", preview: "🍓" },
];

export const RARITY_COLORS: Record<AvatarItem["rarity"], string> = {
  common: "#94a3b8",
  rare: "#3b82f6",
  epic: "#8b5cf6",
  legendary: "#f59e0b",
};

export const CATEGORY_LABELS: Record<AvatarCategory, string> = {
  clothing: "Clothing",
  clothesColor: "Outfit Colors",
  top: "Hair & Hats",
  hatColor: "Hat Colors",
  accessories: "Accessories",
  eyes: "Eyes",
  mouth: "Mouth",
  skinColor: "Skin Tone",
  hairColor: "Hair Color",
};

export function getItem(id: string): AvatarItem | undefined {
  return AVATAR_ITEMS.find((i) => i.id === id);
}
