export type AvatarId = "male" | "female";

export type AvatarOption = {
  id: AvatarId;
  label: string;
  src: string;
  detail: string;
};

export type Accessory = {
  id: string;
  name: string;
  src: string;
  slot: "head" | "face";
};

export const AVATARS: AvatarOption[] = [
  {
    id: "male",
    label: "Male mountaineer",
    src: "/avatars/male.jpg",
    detail: "Teal jacket, pack, rope, harness, and boots.",
  },
  {
    id: "female",
    label: "Female mountaineer",
    src: "/avatars/female.jpg",
    detail: "Rust jacket, pack, rope, harness, and boots.",
  },
];

export const ACCESSORIES: Accessory[] = [
  {
    id: "beanie",
    name: "Summit beanie",
    src: "/avatars/beanie.jpg",
    slot: "head",
  },
  {
    id: "glasses",
    name: "Glacier glasses",
    src: "/avatars/glasses.jpg",
    slot: "face",
  },
];

export function isAvatarId(value: unknown): value is AvatarId {
  return value === "male" || value === "female";
}

export function avatarById(id: AvatarId | null | undefined) {
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}

export function normalizeAccessoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const known = new Set(ACCESSORIES.map((item) => item.id));
  return value.filter((item): item is string => typeof item === "string" && known.has(item));
}

export function accessoriesFor(ids: string[]) {
  const wanted = new Set(normalizeAccessoryIds(ids));
  return ACCESSORIES.filter((item) => wanted.has(item.id));
}
