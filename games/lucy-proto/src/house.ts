// Lucy's house: a top-down tile plan. Rooms are the progression; Lucy is already perfect.
// Placeholder layout and objects, just enough to smoke test "can prep produce a different Lucy?"

export const W = 36;
export const H = 22;

export type Tag = "fabric" | "food" | "soft" | "hide" | "noise" | "shiny" | "water" | "warm" | "small";

export type RoomId = "living" | "kitchen" | "hall" | "entry" | "bedroom" | "bathroom" | "laundry";

export type Room = { id: RoomId; name: string; x: number; y: number; w: number; h: number; unlockAt: number; floor: string };

/** unlockAt = journal entries needed. Discovering Lucy opens the house. */
export const ROOMS: Room[] = [
  { id: "living", name: "Living room", x: 1, y: 1, w: 14, h: 10, unlockAt: 0, floor: "#efe3cf" },
  { id: "kitchen", name: "Kitchen", x: 16, y: 1, w: 10, h: 10, unlockAt: 0, floor: "#e6ecdc" },
  { id: "bedroom", name: "Bedroom", x: 27, y: 1, w: 8, h: 10, unlockAt: 6, floor: "#eadff0" },
  { id: "hall", name: "Hallway", x: 1, y: 12, w: 34, h: 3, unlockAt: 0, floor: "#e8dcc4" },
  { id: "bathroom", name: "Bathroom", x: 1, y: 16, w: 10, h: 5, unlockAt: 14, floor: "#dcebf0" },
  { id: "laundry", name: "Laundry", x: 12, y: 16, w: 11, h: 5, unlockAt: 24, floor: "#e9e6f2" },
  { id: "entry", name: "Front entry", x: 24, y: 16, w: 11, h: 5, unlockAt: 0, floor: "#e4dfd6" },
];

/** Doors link a room to the hallway (or living↔kitchen). */
export const DOORS: { x: number; y: number; to: RoomId }[] = [
  { x: 15, y: 5, to: "kitchen" },
  { x: 7, y: 11, to: "living" },
  { x: 20, y: 11, to: "kitchen" },
  { x: 30, y: 11, to: "bedroom" },
  { x: 5, y: 15, to: "bathroom" },
  { x: 17, y: 15, to: "laundry" },
  { x: 29, y: 15, to: "entry" },
];

export const CAGE = { x: 3, y: 3 };
export const STASH = { x: 11, y: 9, label: "under the couch" };

export type Thing = { id: string; name: string; room: RoomId; x: number; y: number; tags: Tag[]; stealable?: boolean; startles?: boolean };

export const THINGS: Thing[] = [
  { id: "couch", name: "couch", room: "living", x: 11, y: 8, tags: ["soft", "hide"] },
  { id: "rug", name: "living room rug", room: "living", x: 7, y: 6, tags: ["fabric", "soft"] },
  { id: "remote", name: "TV remote", room: "living", x: 12, y: 3, tags: ["small", "shiny"], stealable: true },
  { id: "slipper", name: "your slipper", room: "living", x: 4, y: 9, tags: ["fabric", "small"], stealable: true },
  { id: "plant", name: "fiddle-leaf fig", room: "living", x: 2, y: 9, tags: ["hide", "food"] },
  { id: "cushion", name: "throw cushion", room: "living", x: 9, y: 2, tags: ["fabric", "soft"] },
  { id: "bin", name: "kitchen bin", room: "kitchen", x: 24, y: 9, tags: ["food", "noise"] },
  { id: "bowl", name: "the cat's water bowl", room: "kitchen", x: 17, y: 9, tags: ["water", "food"] },
  { id: "towel", name: "dish towel", room: "kitchen", x: 22, y: 2, tags: ["fabric", "small"], stealable: true },
  { id: "bag", name: "paper grocery bag", room: "kitchen", x: 19, y: 5, tags: ["hide", "noise"] },
  { id: "fridge", name: "fridge", room: "kitchen", x: 25, y: 2, tags: ["noise", "warm"], startles: true },
  { id: "runner", name: "hallway runner", room: "hall", x: 12, y: 13, tags: ["fabric", "soft"] },
  { id: "umbrella", name: "umbrella stand", room: "hall", x: 25, y: 12, tags: ["noise", "hide"] },
  { id: "boots", name: "winter boots", room: "entry", x: 26, y: 19, tags: ["hide", "fabric"] },
  { id: "keys", name: "house keys", room: "entry", x: 33, y: 17, tags: ["small", "shiny", "noise"], stealable: true },
  { id: "coat", name: "fallen scarf", room: "entry", x: 30, y: 19, tags: ["fabric", "soft", "small"], stealable: true },
  { id: "bed", name: "the big bed", room: "bedroom", x: 31, y: 5, tags: ["soft", "hide", "warm"] },
  { id: "sock", name: "a single sock", room: "bedroom", x: 28, y: 9, tags: ["fabric", "small"], stealable: true },
  { id: "cable", name: "phone charger", room: "bedroom", x: 34, y: 2, tags: ["small", "shiny"], stealable: true },
  { id: "tub", name: "bathtub", room: "bathroom", x: 3, y: 18, tags: ["water"] },
  { id: "mat", name: "bath mat", room: "bathroom", x: 7, y: 19, tags: ["fabric", "soft", "water"] },
  { id: "duck", name: "rubber duck", room: "bathroom", x: 9, y: 17, tags: ["small", "noise", "water"], stealable: true },
  { id: "dryer", name: "dryer", room: "laundry", x: 13, y: 17, tags: ["warm", "noise"], startles: true },
  { id: "basket", name: "laundry basket", room: "laundry", x: 17, y: 19, tags: ["fabric", "soft", "hide"] },
  { id: "sheet", name: "dryer sheet", room: "laundry", x: 21, y: 18, tags: ["fabric", "small"], stealable: true },
];

/** Things that turn up in the house between runs (the world rng picks them, never Lucy's prep). */
export const ARRIVALS: Omit<Thing, "x" | "y" | "room">[] = [
  { id: "box", name: "an Amazon box", tags: ["hide", "noise"] },
  { id: "ribbon", name: "a curly ribbon", tags: ["fabric", "small", "shiny"], stealable: true },
  { id: "balloon", name: "a leftover balloon", tags: ["noise", "shiny"], startles: true },
  { id: "mitten", name: "one mitten", tags: ["fabric", "small", "warm"], stealable: true },
  { id: "pingpong", name: "a ping-pong ball", tags: ["small", "noise"], stealable: true },
  { id: "tissue", name: "a crinkly tissue box", tags: ["noise", "fabric", "hide"] },
  { id: "crumbs", name: "toast crumbs", tags: ["food", "small"] },
  { id: "hoodie", name: "a warm hoodie on the floor", tags: ["fabric", "soft", "warm"] },
  { id: "bottlecap", name: "a bottle cap", tags: ["small", "shiny"], stealable: true },
  { id: "suitcase", name: "an open suitcase", tags: ["hide", "fabric", "soft"] },
];

export const roomAt = (x: number, y: number): RoomId | null => {
  for (const r of ROOMS) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.id;
  const d = DOORS.find((d) => d.x === x && d.y === y);
  return d ? d.to : null;
};

export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id)!;

/** Walkable if inside an unlocked room, or on a door into one. */
export function walkable(x: number, y: number, unlocked: Set<RoomId>): boolean {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const door = DOORS.find((d) => d.x === x && d.y === y);
  if (door) return unlocked.has(door.to);
  const r = ROOMS.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  return !!r && unlocked.has(r.id);
}
