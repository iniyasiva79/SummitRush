export type AvatarId = "male" | "female";

export type AccessorySlot =
  | "head"
  | "face"
  | "pack"
  | "boots"
  | "trail"
  | "prints"
  | "summit"
  | "banner";

export type ShopCategory = "gear" | "effects" | "avatars";

export type AvatarOption = {
  id: AvatarId;
  label: string;
  src: string;
  trailSrc: string;
  detail: string;
};

export type Accessory = {
  id: string;
  name: string;
  src: string;
  overlaySrc?: string;
  detail: string;
  slot: AccessorySlot;
  category: ShopCategory;
  price: number;
};

export const AVATARS: AvatarOption[] = [
  {
    id: "male",
    label: "Male mountaineer",
    src: "/avatars/male.jpg",
    trailSrc: "/avatars/male-trail.png",
    detail: "Teal jacket, pack, rope, harness, and boots.",
  },
  {
    id: "female",
    label: "Female mountaineer",
    src: "/avatars/female.jpg",
    trailSrc: "/avatars/female-trail.png",
    detail: "Rust jacket, pack, rope, harness, and boots.",
  },
];

export const ACCESSORIES: Accessory[] = [
  {
    id: "beanie",
    name: "Summit beanie",
    src: "/avatars/beanie.jpg",
    overlaySrc: "/avatars/beanie-overlay.png",
    detail: "A rust knit hat for cold ridgelines.",
    slot: "head",
    category: "gear",
    price: 75,
  },
  {
    id: "glasses",
    name: "Glacier glasses",
    src: "/avatars/glasses.jpg",
    overlaySrc: "/avatars/glasses-overlay.png",
    detail: "Dark glacier glasses for bright snow.",
    slot: "face",
    category: "gear",
    price: 90,
  },
  {
    id: "helmet",
    name: "Climbing helmet",
    src: "/shop/helmet.jpg",
    overlaySrc: "/avatars/helmet-overlay.png",
    detail: "A lightweight helmet for rocky pitches.",
    slot: "head",
    category: "gear",
    price: 125,
  },
  {
    id: "backpack",
    name: "Expedition backpack",
    src: "/shop/backpack.jpg",
    overlaySrc: "/avatars/backpack-overlay.png",
    detail: "A roomy pack for a long climb.",
    slot: "pack",
    category: "gear",
    price: 150,
  },
  {
    id: "boots",
    name: "Trail boots",
    src: "/shop/boots.jpg",
    overlaySrc: "/avatars/boots-overlay.png",
    detail: "Stiff-soled boots for mixed terrain.",
    slot: "boots",
    category: "gear",
    price: 110,
  },
  {
    id: "sparkle",
    name: "Sparkling trail",
    src: "/shop/sparkle.jpg",
    detail: "Gold dust follows the climber on the path.",
    slot: "trail",
    category: "effects",
    price: 250,
  },
  {
    id: "footprints",
    name: "Footprint effects",
    src: "/shop/footprints.jpg",
    detail: "Boot prints mark recent steps on the trail.",
    slot: "prints",
    category: "effects",
    price: 175,
  },
  {
    id: "flag",
    name: "Checkpoint flag design",
    src: "/shop/flags.jpg",
    detail: "Gold checkpoint flags along the climb.",
    slot: "banner",
    category: "effects",
    price: 200,
  },
  {
    id: "celebration",
    name: "Summit celebration",
    src: "/shop/celebration.jpg",
    detail: "A larger summit burst when the mountain is finished.",
    slot: "summit",
    category: "effects",
    price: 1100,
  },
];

export function isAvatarId(value: unknown): value is AvatarId {
  return value === "male" || value === "female";
}

export function avatarById(id: AvatarId | null | undefined) {
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}

export function accessoryById(id: string | null | undefined) {
  return ACCESSORIES.find((item) => item.id === id) ?? null;
}

export function normalizeAccessoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const known = new Set(ACCESSORIES.map((item) => item.id));
  const unique: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && known.has(item) && !unique.includes(item)) {
      unique.push(item);
    }
  }
  return unique;
}

export function accessoriesFor(ids: string[]) {
  const wanted = new Set(normalizeAccessoryIds(ids));
  return ACCESSORIES.filter((item) => wanted.has(item.id));
}

export function wearablesFor(ids: string[]) {
  return accessoriesFor(ids).filter((item) => item.overlaySrc);
}

export function toggleEquipped(owned: string[], equipped: string[], itemId: string) {
  if (!owned.includes(itemId)) {
    return equipped;
  }
  const item = accessoryById(itemId);
  if (!item) {
    return equipped;
  }
  if (equipped.includes(itemId)) {
    return equipped.filter((id) => id !== itemId);
  }
  return [...equipped.filter((id) => accessoryById(id)?.slot !== item.slot), itemId];
}

export function grantOwned(owned: string[], equipped: string[], itemId: string) {
  const item = accessoryById(itemId);
  if (!item) {
    return { owned, equipped };
  }
  const nextOwned = owned.includes(itemId) ? owned : [...owned, itemId];
  const slotTaken = equipped.some((id) => accessoryById(id)?.slot === item.slot);
  return {
    owned: nextOwned,
    equipped: slotTaken ? equipped : toggleEquipped(nextOwned, equipped, itemId),
  };
}
