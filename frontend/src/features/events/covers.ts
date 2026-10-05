/**
 * Bundled cover photos (free Unsplash licence; see src/assets/covers/CREDITS.md).
 *
 * The API stores only a key such as "sourdough". The files ship with the app
 * (two widths each, WebP), so visitors' browsers never contact a third party.
 */

import type { EventCategory } from "@/lib/api/types";

const files = import.meta.glob<string>("/src/assets/covers/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

interface CoverMeta {
  label: string;
  alt: string;
  author: string;
  username: string;
  photoId: string;
  /** Average colour, shown while the image loads. */
  tone: string;
}

export const COVERS = {
  "repair-cafe": { label: "Workshop tools", alt: "Hand tools hanging on a workshop wall", author: "Barn Images", username: "barnimages", photoId: "t5YUoHW6zRo", tone: "#7a5a3c" },
  sourdough: { label: "Fresh bread", alt: "A crusty round loaf of sourdough on a counter", author: "Ben Stein", username: "benostein", photoId: "NPYmhef4kX4", tone: "#8a5a2e" },
  "yoga-park": { label: "Yoga in the park", alt: "People doing yoga on mats in a park at sunset", author: "Vitaly Gariev", username: "silverkblack", photoId: "CAMTvmtpuCE", tone: "#5f6b3a" },
  "open-mic": { label: "Stage microphone", alt: "A microphone on a stage under purple light", author: "TheRegisti", username: "theregisti", photoId: "VPHVg1X8QqE", tone: "#3b2a8a" },
  "litter-pick": { label: "Riverside clean-up", alt: "Volunteers collecting litter along a riverbank", author: "Vitaly Gariev", username: "silverkblack", photoId: "tX-A7eBc45Q", tone: "#4f6a5a" },
  seedlings: { label: "Seedlings", alt: "Green seedlings growing in small black pots", author: "Markus Spiske", username: "markusspiske", photoId: "4PG6wLlVag4", tone: "#2f3a25" },
  watercolour: { label: "Watercolour painting", alt: "A hand painting with a watercolour palette", author: "Wioleta Zakrzewska", username: "wiozak", photoId: "BZUo9Tf83HQ", tone: "#c9c4bd" },
  "code-club": { label: "Laptop glow", alt: "An open laptop glowing in the dark", author: "Ales Nesetril", username: "alesnesetril", photoId: "Im7lZjxeLhg", tone: "#1c1830" },
  "board-games": { label: "Board game night", alt: "Colourful game pieces on a board game", author: "Christopher Paul High", username: "christopherphigh", photoId: "fwRMK19zavc", tone: "#6b4a3a" },
  "night-sky": { label: "Starry sky", alt: "Snowy mountains under a starry night sky", author: "brandon siu", username: "brandonsiu", photoId: "nI7knd5sQfo", tone: "#1f2240" },
  "craft-table": { label: "Craft table", alt: "A table covered in paper, scissors and craft supplies", author: "Julia Taubitz", username: "justmejuliee", photoId: "K_BpdS338z4", tone: "#9a6b5a" },
  "garden-beds": { label: "Garden beds", alt: "Raised garden beds with handwritten plant labels", author: "Matt Baker", username: "himattbaker", photoId: "laVKzRJpvnw", tone: "#2e3b28" },
  lightbulb: { label: "Light bulb", alt: "A glowing light bulb against a dark background", author: "User_Pascal", username: "user_pascal", photoId: "2DFtOTOnIe8", tone: "#2a1d0a" },
  "market-hall": { label: "Busy market", alt: "A lively market hall full of people under wooden beams", author: "Adrien Olichon", username: "adrienolichon", photoId: "K1tJxornlfk", tone: "#5a4a3a" },
  "string-lights": { label: "String lights", alt: "Festoon lights strung above a street at dusk", author: "Ian Battaglia", username: "ianjbattaglia", photoId: "LmQpAJmUZ9k", tone: "#2a3550" },
} satisfies Record<string, CoverMeta>;

export type CoverKey = keyof typeof COVERS;

export const COVER_KEYS = Object.keys(COVERS) as CoverKey[];

export const CATEGORY_DEFAULT_COVER: Record<EventCategory, CoverKey> = {
  community: "market-hall",
  arts: "watercolour",
  tech: "code-club",
  outdoors: "garden-beds",
  food: "sourdough",
  wellbeing: "yoga-park",
  learning: "night-sky",
};

export interface Cover extends CoverMeta {
  key: CoverKey;
  small: string;
  large: string;
  creditUrl: string;
}

function isCoverKey(value: string): value is CoverKey {
  return value in COVERS;
}

export function getCover(key: CoverKey): Cover {
  const meta = COVERS[key];
  const utm = "utm_source=gather_demo&utm_medium=referral";
  return {
    ...meta,
    key,
    small: files[`/src/assets/covers/${key}-800.webp`] ?? "",
    large: files[`/src/assets/covers/${key}-1600.webp`] ?? "",
    creditUrl: `https://unsplash.com/@${meta.username}?${utm}`,
  };
}

/** The event's chosen cover, or its category's default. */
export function coverFor(event: { cover_image?: string; category: EventCategory }): Cover {
  const chosen = event.cover_image;
  return getCover(chosen && isCoverKey(chosen) ? chosen : CATEGORY_DEFAULT_COVER[event.category]);
}

/** View-transition name shared by a card's photo and the event page hero. */
export const coverTransitionName = (id: string) => `cover-${id.replace(/[^a-zA-Z0-9-]/g, "")}`;
