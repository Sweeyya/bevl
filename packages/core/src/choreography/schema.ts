import { z } from "zod";
import { behaviorNames, getBehavior } from "./behaviors.js";
import type { Choreography, KeyValue, Track } from "./types.js";

const HEX = /^#[0-9a-fA-F]{6}$/;
const VEC3_PROPS = new Set(["position", "lookAt", "rotation", "scale"]);
const COLOR_PROPS = new Set(["color", "emissive"]);
const CAMERA_PROPS = ["position", "lookAt", "fov"];

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const progress = z.number().min(0).max(1);
const ease = z.enum(["linear", "smooth", "easeIn", "easeOut", "easeInOut"]);
const snapSettings = z.strictObject({
  mode: z.enum(["directional", "nearest", "strong", "none"]).exactOptional(),
  delay: z.number().min(0).max(5).exactOptional(),
  commit: z.number().min(0).max(1).exactOptional(),
  duration: z.number().min(0).max(5).exactOptional(),
});
const track = z.strictObject({
  target: z.string().min(1),
  prop: z.string().min(1),
  keys: z
    .array(
      z.strictObject({
        at: progress,
        value: z.union([z.number(), vec3, z.string().regex(HEX)]),
        ease: ease.exactOptional(),
      }),
    )
    .min(1),
  path: z.enum(["linear", "curve"]).exactOptional(),
});
const inputKind = z.enum(["scroll", "wheel", "touch", "drag", "swipe-x", "tap-advance"]);

export const choreographySchema: z.ZodType<Choreography> = z.strictObject({
  version: z.literal(1),
  beats: z.array(
    z.strictObject({ id: z.string().min(1), at: progress, snap: z.boolean().exactOptional() }),
  ),
  camera: z.strictObject({
    position: vec3,
    lookAt: vec3.exactOptional(),
    fov: z.number().min(1).max(179).exactOptional(),
  }),
  layouts: z
    .record(
      z.string(),
      z.strictObject({
        arrange: z.enum(["line", "grid", "ring", "onSphere", "alongPath"]),
        radius: z.number().positive().exactOptional(),
        spacing: z.number().exactOptional(),
        columns: z.number().int().positive().exactOptional(),
        direction: vec3.exactOptional(),
        points: z.array(vec3).exactOptional(),
        facing: z.enum(["inward", "outward", "camera"]).exactOptional(),
        center: vec3.exactOptional(),
      }),
    )
    .exactOptional(),
  tracks: z.array(track).exactOptional(),
  behaviors: z.array(z.string().min(1)).exactOptional(),
  input: z
    .strictObject({
      fine: z.array(inputKind).exactOptional(),
      coarse: z.array(inputKind).exactOptional(),
      wheelMultiplier: z.number().positive().exactOptional(),
      touchMultiplier: z.number().positive().exactOptional(),
      smoothing: z.number().min(0).exactOptional(),
    })
    .exactOptional(),
  snap: snapSettings.extend({ coarse: snapSettings.exactOptional() }).exactOptional(),
  allow: z
    .strictObject({
      roll: z.boolean().exactOptional(),
      spin: z.boolean().exactOptional(),
      fastMoves: z.boolean().exactOptional(),
      reducedMotion: z.boolean().exactOptional(),
    })
    .exactOptional(),
  reducedMotion: z
    .strictObject({
      mode: z.enum(["fade", "none"]).exactOptional(),
      tracks: z.array(track).exactOptional(),
      behaviors: z.array(z.string().min(1)).exactOptional(),
    })
    .exactOptional(),
});

export type ValidationResult = { ok: true; value: Choreography } | { ok: false; errors: string[] };

function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "choreography";
  return path
    .map((p, i) => (typeof p === "number" ? `[${p}]` : i === 0 ? String(p) : `.${String(p)}`))
    .join("");
}

function fixFor(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case "invalid_type":
      return issue.expected === "tuple" ? "use [x, y, z]." : `set it to a ${issue.expected}.`;
    case "unrecognized_keys":
      return `remove ${issue.keys.map((k) => `"${k}"`).join(", ")}.`;
    case "invalid_value":
      return `use one of ${issue.values.map((v) => JSON.stringify(v)).join(", ")}.`;
    case "too_small":
      return issue.origin === "array"
        ? `add at least ${issue.minimum} item(s).`
        : `use a value of at least ${issue.minimum}.`;
    case "too_big":
      return `use a value of at most ${issue.maximum}.`;
    case "invalid_union":
      return 'use a number, [x, y, z], or a color like "#ff8800".';
    case "invalid_format":
      return 'use a color like "#ff8800".';
    default:
      return "see docs/adr/003-scroll-choreography.md for the expected shape.";
  }
}

function kindOf(v: KeyValue): "number" | "vec3" | "color" {
  if (typeof v === "number") return "number";
  return Array.isArray(v) ? "vec3" : "color";
}

function checkTrack(track: Track, at: string, errors: string[]): void {
  const last = track.prop.split(".").pop() ?? track.prop;
  if (track.target === "camera" && !CAMERA_PROPS.includes(track.prop)) {
    errors.push(
      `${at}.prop "${track.prop}" is not a camera prop. Fix: use one of ${CAMERA_PROPS.join(", ")}.`,
    );
  }
  const expected =
    track.target === "camera" && track.prop === "fov"
      ? "number"
      : track.prop === last && VEC3_PROPS.has(last)
        ? "vec3"
        : COLOR_PROPS.has(last)
          ? "color"
          : undefined;
  const firstKey = track.keys[0];
  const kind = expected ?? (firstKey ? kindOf(firstKey.value) : "number");
  const hint = { number: "a number", vec3: "[x, y, z]", color: 'a color like "#ff8800"' }[kind];

  track.keys.forEach((key, j) => {
    const prev = track.keys[j - 1];
    if (prev && key.at < prev.at) {
      errors.push(
        `${at}.keys[${j}].at (${key.at}) is before keys[${j - 1}].at (${prev.at}). Fix: sort keys by at.`,
      );
    }
    if (kindOf(key.value) !== kind) {
      errors.push(
        `${at}.keys[${j}].value for "${track.prop}" has the wrong type. Fix: use ${hint} for every key.`,
      );
    }
  });
  if (track.path === "curve" && kind !== "vec3") {
    errors.push(`${at}.path "curve" needs [x, y, z] values. Fix: remove path or use [x, y, z].`);
  }
}

/** Validate a choreography spec against the section ids. Errors name the field and include a Fix. */
export function validateChoreography(input: unknown, sectionIds: string[]): ValidationResult {
  const parsed = choreographySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${formatPath(issue.path)}: ${issue.message}. Fix: ${fixFor(issue)}`,
      ),
    };
  }

  const choreo = parsed.data;
  const errors: string[] = [];
  const known = new Set(sectionIds);
  const seen = new Set<string>();

  choreo.beats.forEach((beat, i) => {
    if (!known.has(beat.id)) {
      errors.push(
        `beats[${i}].id "${beat.id}" does not match any section. Fix: use one of ${sectionIds.join(", ")}.`,
      );
    }
    if (seen.has(beat.id)) {
      errors.push(`beats[${i}].id "${beat.id}" is used twice. Fix: keep one beat per section.`);
    }
    seen.add(beat.id);
    const prev = choreo.beats[i - 1];
    if (prev && beat.at < prev.at) {
      errors.push(
        `beats[${i}].at (${beat.at}) is before beats[${i - 1}].at (${prev.at}). Fix: order beats by at, from 0 to 1.`,
      );
    }
  });
  for (const id of sectionIds) {
    if (!seen.has(id)) {
      errors.push(`beats is missing section "${id}". Fix: add { "id": "${id}", "at": <0-1> }.`);
    }
  }

  for (const [id, layout] of Object.entries(choreo.layouts ?? {})) {
    if (layout.arrange === "alongPath" && (layout.points?.length ?? 0) < 2) {
      errors.push(
        `layouts.${id}.points needs at least 2 points for "alongPath". Fix: add points like [[0, 0, 0], [0, 0, -10]].`,
      );
    }
  }

  (choreo.tracks ?? []).forEach((track, i) => {
    checkTrack(track, `tracks[${i}]`, errors);
  });
  (choreo.reducedMotion?.tracks ?? []).forEach((track, i) => {
    checkTrack(track, `reducedMotion.tracks[${i}]`, errors);
  });

  const behaviorLists = [
    ["behaviors", choreo.behaviors ?? []],
    ["reducedMotion.behaviors", choreo.reducedMotion?.behaviors ?? []],
  ] as const;
  for (const [field, list] of behaviorLists)
    list.forEach((name, i) => {
      if (getBehavior(name)) return;
      const names = behaviorNames();
      errors.push(
        `${field}[${i}] "${name}" is not registered. Fix: call registerBehavior("${name}", fn) before rendering${
          names.length ? `, or use one of ${names.join(", ")}` : ""
        }.`,
      );
    });

  return errors.length ? { ok: false, errors } : { ok: true, value: choreo };
}
