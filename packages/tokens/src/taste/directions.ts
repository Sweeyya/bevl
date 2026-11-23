import type { BriefKind } from "./brief.js";

export type ScrollStyle =
  | "fly-through"
  | "sphere-of-screens"
  | "carousel"
  | "room"
  | "horizontal-gallery"
  | "orbit-product";

export type Easing = "linear" | "smooth" | "easeIn" | "easeOut" | "easeInOut";

export interface MaterialMood {
  roughness: number;
  metalness: number;
  emissive: number;
}

export interface Light {
  color: string;
  intensity: number;
}

export interface ArtDirection {
  id: string;
  name: string;
  description: string;
  mood: string[];
  kinds: BriefKind[];
  palette: {
    background: string;
    surface: string;
    text: string;
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: { heading: string; body: string };
  materials: {
    primary: MaterialMood;
    secondary: MaterialMood;
    surface: MaterialMood;
    accent: MaterialMood;
  };
  lighting: { ambient: Light; key: Light; fill: Light; rim: Light };
  scrollStyles: ScrollStyle[];
  motion: { snapDelay: number; snapDuration: number; easing: Easing };
  dressing: {
    floor: "none" | "mirror" | "matte" | "grid";
    backdrop: "void" | "gradient" | "fog" | "wall";
    particles: boolean;
  };
  avoid: string[];
}

export const directions: ArtDirection[] = [
  {
    id: "roastery-night",
    name: "Roastery Night",
    description:
      "A warm, low-lit room after closing: honey light pooling on dark wood, steam in the air.",
    mood: ["warm", "cozy", "craft", "intimate", "handmade", "rich", "inviting", "cafe", "food"],
    kinds: ["venue", "story", "landing"],
    palette: {
      background: "#130f0d",
      surface: "#261e19",
      text: "#f6eee3",
      primary: "#e8a33d",
      secondary: "#8fb996",
      accent: "#5fc9c0",
    },
    fonts: {
      heading: 'Georgia, "Times New Roman", serif',
      body: '"Gill Sans", "Trebuchet MS", Calibri, sans-serif',
    },
    materials: {
      primary: { roughness: 0.35, metalness: 0.6, emissive: 0.1 },
      secondary: { roughness: 0.8, metalness: 0, emissive: 0 },
      surface: { roughness: 0.65, metalness: 0.05, emissive: 0 },
      accent: { roughness: 0.4, metalness: 0, emissive: 0.5 },
    },
    lighting: {
      ambient: { color: "#3a2a20", intensity: 0.35 },
      key: { color: "#ffb25c", intensity: 2.2 },
      fill: { color: "#5fc9c0", intensity: 0.3 },
      rim: { color: "#ffd9a0", intensity: 1.4 },
    },
    scrollStyles: ["room", "fly-through", "carousel"],
    motion: { snapDelay: 0.5, snapDuration: 1.2, easing: "easeInOut" },
    dressing: { floor: "matte", backdrop: "fog", particles: true },
    avoid: ["pure black voids", "cold blue light", "glossy plastic", "stock coffee-bean icons"],
  },
  {
    id: "studio-daylight",
    name: "Studio Daylight",
    description:
      "A bright white-cyc studio with soft overhead light, crisp shadows and one sharp colour pop.",
    mood: ["clean", "bright", "precise", "editorial", "modern", "calm", "minimal", "design"],
    kinds: ["portfolio", "saas", "gallery", "landing"],
    palette: {
      background: "#eef2f4",
      surface: "#fbfcfd",
      text: "#0e1c26",
      primary: "#0c6b6b",
      secondary: "#c8324b",
      accent: "#f2a900",
    },
    fonts: {
      heading: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
      body: '"Helvetica Neue", Helvetica, "Segoe UI", sans-serif',
    },
    materials: {
      primary: { roughness: 0.3, metalness: 0.1, emissive: 0 },
      secondary: { roughness: 0.45, metalness: 0, emissive: 0 },
      surface: { roughness: 0.9, metalness: 0, emissive: 0 },
      accent: { roughness: 0.25, metalness: 0, emissive: 0.15 },
    },
    lighting: {
      ambient: { color: "#b9c9d2", intensity: 0.45 },
      key: { color: "#ffffff", intensity: 1.5 },
      fill: { color: "#9fbccc", intensity: 0.5 },
      rim: { color: "#ffffff", intensity: 0.7 },
    },
    scrollStyles: ["horizontal-gallery", "carousel", "orbit-product"],
    motion: { snapDelay: 0.3, snapDuration: 0.8, easing: "easeOut" },
    dressing: { floor: "matte", backdrop: "gradient", particles: false },
    avoid: [
      "dark mode",
      "heavy shadows",
      "more than one accent colour per screen",
      "stock gradients",
    ],
  },
  {
    id: "showroom-black",
    name: "Showroom Black",
    description:
      "A dark showroom where one hard spotlight and a reflective floor make the product the only bright thing.",
    mood: ["premium", "sleek", "bold", "technical", "powerful", "product", "luxury", "dark"],
    kinds: ["product", "landing", "saas"],
    palette: {
      background: "#0b0d10",
      surface: "#171b21",
      text: "#f2f5f8",
      primary: "#ff5a36",
      secondary: "#9aa7b4",
      accent: "#e6ff4d",
    },
    fonts: {
      heading: 'Futura, "Century Gothic", "Trebuchet MS", sans-serif',
      body: 'Optima, Candara, "Segoe UI", sans-serif',
    },
    materials: {
      primary: { roughness: 0.2, metalness: 0.9, emissive: 0.05 },
      secondary: { roughness: 0.35, metalness: 1, emissive: 0 },
      surface: { roughness: 0.15, metalness: 0.4, emissive: 0 },
      accent: { roughness: 0.3, metalness: 0, emissive: 0.8 },
    },
    lighting: {
      ambient: { color: "#1a2230", intensity: 0.4 },
      key: { color: "#ffffff", intensity: 3.4 },
      fill: { color: "#6b7a8c", intensity: 0.4 },
      rim: { color: "#ff7a5c", intensity: 2.2 },
    },
    scrollStyles: ["orbit-product", "fly-through", "carousel"],
    motion: { snapDelay: 0.4, snapDuration: 1, easing: "easeInOut" },
    dressing: { floor: "mirror", backdrop: "void", particles: false },
    avoid: ["flat even lighting", "rounded cartoon shapes", "more than one accent glow"],
  },
  {
    id: "afterglow",
    name: "Afterglow",
    description:
      "A club at 1 a.m.: neon edges on deep green-black, haze and light that moves with you.",
    mood: [
      "energetic",
      "playful",
      "night",
      "loud",
      "party",
      "electric",
      "festival",
      "music",
      "neon",
    ],
    kinds: ["event", "venue", "other"],
    palette: {
      background: "#06100e",
      surface: "#0f211d",
      text: "#eafbf5",
      primary: "#3dffb0",
      secondary: "#ff3d81",
      accent: "#ffd23f",
    },
    fonts: {
      heading: 'Impact, "Arial Narrow Bold", Haettenschweiler, sans-serif',
      body: '"Courier New", Courier, monospace',
    },
    materials: {
      primary: { roughness: 0.3, metalness: 0.2, emissive: 0.9 },
      secondary: { roughness: 0.4, metalness: 0, emissive: 0.7 },
      surface: { roughness: 0.5, metalness: 0.3, emissive: 0.05 },
      accent: { roughness: 0.3, metalness: 0, emissive: 1 },
    },
    lighting: {
      ambient: { color: "#0b2a22", intensity: 0.3 },
      key: { color: "#3dffb0", intensity: 1.8 },
      fill: { color: "#ff3d81", intensity: 1.2 },
      rim: { color: "#ffd23f", intensity: 1.6 },
    },
    scrollStyles: ["sphere-of-screens", "carousel", "fly-through"],
    motion: { snapDelay: 0.2, snapDuration: 0.6, easing: "easeOut" },
    dressing: { floor: "grid", backdrop: "fog", particles: true },
    avoid: ["pastel colours", "slow fades", "static camera", "purple or blue haze"],
  },
  {
    id: "stillwater",
    name: "Stillwater",
    description:
      "A quiet pale-green room at dawn: soft window light, matte stone, slow drifting air.",
    mood: ["calm", "serene", "gentle", "natural", "wellness", "soft", "organic", "airy", "health"],
    kinds: ["story", "venue", "landing", "other"],
    palette: {
      background: "#e4ede8",
      surface: "#f6faf8",
      text: "#16271f",
      primary: "#2b6a58",
      secondary: "#9a6a24",
      accent: "#b0505c",
    },
    fonts: {
      heading: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
      body: 'Verdana, Geneva, "DejaVu Sans", sans-serif',
    },
    materials: {
      primary: { roughness: 0.7, metalness: 0, emissive: 0 },
      secondary: { roughness: 0.55, metalness: 0.2, emissive: 0 },
      surface: { roughness: 0.95, metalness: 0, emissive: 0 },
      accent: { roughness: 0.5, metalness: 0, emissive: 0.1 },
    },
    lighting: {
      ambient: { color: "#e8f3ee", intensity: 0.8 },
      key: { color: "#fff3dc", intensity: 1.8 },
      fill: { color: "#cfe6dc", intensity: 0.7 },
      rim: { color: "#ffffff", intensity: 0.6 },
    },
    scrollStyles: ["room", "fly-through", "horizontal-gallery"],
    motion: { snapDelay: 0.8, snapDuration: 1.8, easing: "smooth" },
    dressing: { floor: "matte", backdrop: "fog", particles: true },
    avoid: ["hard contrast", "neon", "fast motion", "sharp metal"],
  },
  {
    id: "museum-concrete",
    name: "Museum Concrete",
    description:
      "A raw concrete gallery with one raking light across the wall and a single red mark of colour.",
    mood: ["raw", "bold", "architectural", "serious", "art", "brutalist", "minimal", "artist"],
    kinds: ["gallery", "portfolio", "story", "product"],
    palette: {
      background: "#dcd9d2",
      surface: "#efede8",
      text: "#141414",
      primary: "#c4162a",
      secondary: "#1d5c78",
      accent: "#f0b800",
    },
    fonts: {
      heading: 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace',
      body: 'system-ui, "Segoe UI", Roboto, sans-serif',
    },
    materials: {
      primary: { roughness: 0.4, metalness: 0, emissive: 0 },
      secondary: { roughness: 0.6, metalness: 0.3, emissive: 0 },
      surface: { roughness: 1, metalness: 0, emissive: 0 },
      accent: { roughness: 0.35, metalness: 0, emissive: 0.1 },
    },
    lighting: {
      ambient: { color: "#cfcbc2", intensity: 0.45 },
      key: { color: "#fff6e8", intensity: 3 },
      fill: { color: "#b9c4cc", intensity: 0.35 },
      rim: { color: "#ffffff", intensity: 0.8 },
    },
    scrollStyles: ["horizontal-gallery", "orbit-product", "carousel"],
    motion: { snapDelay: 0.6, snapDuration: 1.4, easing: "easeInOut" },
    dressing: { floor: "matte", backdrop: "wall", particles: false },
    avoid: ["rounded friendly shapes", "glow", "more than one saturated colour per screen"],
  },
];
