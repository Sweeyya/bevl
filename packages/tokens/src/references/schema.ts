import { z } from "zod";
import { BRIEF_KINDS } from "../taste/brief.js";

export const ARCHETYPES = [
  "illustrated-world",
  "stylized-3d-scene",
  "photoreal-walkthrough",
  "gallery-hall",
  "product-showcase",
  "device-interface",
  "glass-and-light",
] as const;

export const RENDER_STYLES = [
  "ink-halftone",
  "pixel",
  "photoreal",
  "stylized-pbr",
  "crt-retro",
  "glass",
] as const;

export const CAMERA_PATTERNS = [
  "fly-through",
  "orbit",
  "glide-along-path",
  "cuts-and-wipes",
  "product-rotate",
] as const;

export const FEASIBILITY = ["code-only", "partly-code", "needs-assets"] as const;

export const SCROLL_STYLES = [
  "fly-through",
  "sphere-of-screens",
  "carousel",
  "room",
  "horizontal-gallery",
  "orbit-product",
] as const;

const text = (max: number) => z.string().min(1).max(max);

export const referenceSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: text(80),
  source: z.strictObject({ kind: z.enum(["reel", "site", "repo", "own"]), credit: text(120) }),
  summary: text(400),
  archetype: z.enum(ARCHETYPES),
  renderStyle: z.enum(RENDER_STYLES),
  camera: z.enum(CAMERA_PATTERNS),
  mood: z.array(text(30)).min(1).max(8),
  palette: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .min(2)
    .max(6),
  typography: text(240),
  motion: text(240),
  interaction: z.array(text(80)).max(6),
  assets: z
    .array(z.strictObject({ kind: text(80), from: z.enum(["code", "external"]), note: text(200) }))
    .min(1)
    .max(8),
  needs: z
    .array(
      z.strictObject({ capability: text(140), status: z.enum(["exists", "partial", "missing"]) }),
    )
    .min(1)
    .max(10),
  liked: z.array(text(40)).max(8),
  feasibility: z.enum(FEASIBILITY),
  priority: z.enum(["first", "later"]),
  suggestedKinds: z.array(z.enum(BRIEF_KINDS)).min(1).max(4),
  suggestedScrollStyle: z.enum(SCROLL_STYLES),
});

export type Reference = z.output<typeof referenceSchema>;
