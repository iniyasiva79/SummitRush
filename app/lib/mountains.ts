export type MountainId =
  | "fuji"
  | "washington"
  | "kilimanjaro"
  | "rinjani"
  | "annapurna"
  | "aconcagua"
  | "denali"
  | "vinson"
  | "k2"
  | "everest";

export type Mountain = {
  id: MountainId;
  name: string;
  tasks: number;
  feature: string;
  geography: string;
  src: string;
};

export const MOUNTAINS: Mountain[] = [
  {
    id: "fuji",
    name: "Mount Fuji",
    tasks: 2,
    feature: "Symmetric snow-capped volcanic cone",
    geography: "Honshu, Japan. North-face snow cap, gray shoulders, and forested base.",
    src: "/mountains/cards/fuji.jpg",
  },
  {
    id: "washington",
    name: "Mount Washington",
    tasks: 4,
    feature: "Rocky alpine summit in the Presidential Range",
    geography: "New Hampshire, USA. Broad rock summit, alpine tundra, and fast weather.",
    src: "/mountains/cards/washington.jpg",
  },
  {
    id: "kilimanjaro",
    name: "Mount Kilimanjaro",
    tasks: 7,
    feature: "Uhuru Peak glaciers above the savanna",
    geography: "Tanzania. Freestanding volcano with a snowy summit plateau.",
    src: "/mountains/cards/kilimanjaro.jpg",
  },
  {
    id: "rinjani",
    name: "Mount Rinjani",
    tasks: 10,
    feature: "Segara Anak crater lake and Barujari cone",
    geography: "Lombok, Indonesia. A caldera lake with a smaller active cone inside it.",
    src: "/mountains/cards/rinjani.jpg",
  },
  {
    id: "annapurna",
    name: "Annapurna Circuit",
    tasks: 14,
    feature: "Annapurna wall and the high Thorong La",
    geography: "Nepal Himalaya. Snow massif, deep gorge, and a high pass.",
    src: "/mountains/cards/annapurna.jpg",
  },
  {
    id: "aconcagua",
    name: "Aconcagua",
    tasks: 18,
    feature: "High Andes scree and the Polish Glacier",
    geography: "Argentina. The Andes' highest peak, brown rock with a glacier on one face.",
    src: "/mountains/cards/aconcagua.jpg",
  },
  {
    id: "denali",
    name: "Denali",
    tasks: 21,
    feature: "Huge ice-covered Alaska Range massif",
    geography: "Alaska, USA. Great vertical relief and long glaciers.",
    src: "/mountains/cards/denali.jpg",
  },
  {
    id: "vinson",
    name: "Mount Vinson",
    tasks: 30,
    feature: "Ellsworth Mountains ice and rock",
    geography: "Antarctica. A cold sentinel of ice, rock, and polar light.",
    src: "/mountains/cards/vinson.jpg",
  },
  {
    id: "k2",
    name: "K2",
    tasks: 45,
    feature: "Steep Karakoram pyramid",
    geography: "Karakoram. Sharp rock and ice, including the Abruzzi Spur.",
    src: "/mountains/cards/k2.jpg",
  },
  {
    id: "everest",
    name: "Mount Everest",
    tasks: 60,
    feature: "Khumbu face beside Lhotse",
    geography: "Nepal and Tibet. The southwest face, yellow band, and South Col.",
    src: "/mountains/cards/everest.jpg",
  },
];

export function isMountainId(value: unknown): value is MountainId {
  return MOUNTAINS.some((mountain) => mountain.id === value);
}

export function mountainById(id: string | null | undefined) {
  return MOUNTAINS.find((mountain) => mountain.id === id) ?? null;
}

export function tasksCompleted(
  mountainTasks: Record<string, number> | undefined,
  id: MountainId,
) {
  const count = mountainTasks?.[id];
  return typeof count === "number" && Number.isInteger(count) && count > 0 ? count : 0;
}

export function isMountainComplete(
  mountainTasks: Record<string, number> | undefined,
  id: MountainId,
) {
  const mountain = mountainById(id);
  return mountain ? tasksCompleted(mountainTasks, id) >= mountain.tasks : false;
}

export function progressLabel(mountainTasks: Record<string, number> | undefined) {
  const current =
    MOUNTAINS.find(
      (mountain) =>
        isMountainUnlocked(mountainTasks, mountain.id) &&
        !isMountainComplete(mountainTasks, mountain.id),
    ) ?? MOUNTAINS[MOUNTAINS.length - 1];
  const done = tasksCompleted(mountainTasks, current.id);
  if (done === 0 && current.id === "fuji") {
    return "Mount Fuji is unlocked, 0 of 2 tasks completed.";
  }
  return `${current.name}: ${done} of ${current.tasks} tasks completed.`;
}

export function isMountainUnlocked(
  mountainTasks: Record<string, number> | undefined,
  id: MountainId,
) {
  const index = MOUNTAINS.findIndex((mountain) => mountain.id === id);
  if (index <= 0) {
    return index === 0;
  }
  const previous = MOUNTAINS[index - 1];
  return tasksCompleted(mountainTasks, previous.id) >= previous.tasks;
}
