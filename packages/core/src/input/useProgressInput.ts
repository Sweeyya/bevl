import { useCallback, useEffect, useRef, useState } from "react";
import type { InputKind, InputSpec, SnapSpec } from "../choreography/types.js";
import { attachInputs } from "./attach.js";
import { ProgressController } from "./progress.js";
import { resolveInputs } from "./resolve.js";
import { resolveSnapSettings } from "./snap.js";

const COARSE_QUERY = "(pointer: coarse)";
const DEFAULT_SMOOTHING = 6;

export interface UseProgressInputArgs {
  el: HTMLElement | null;
  spec?: InputSpec | undefined;
  beats: number[];
  /** Per-beat snap flags, same order as beats. Missing means true. */
  snappable?: boolean[];
  snap?: SnapSpec | undefined;
  testMode: boolean;
}

export interface ProgressInput {
  controller: ProgressController;
  /** Displayed progress. Equals the target in test mode. */
  getProgress: () => number;
  /** Advance smoothing by dt seconds. Call from the frame loop. Returns true while still moving. */
  tick: (dtSeconds: number) => boolean;
}

function queryCoarse(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(COARSE_QUERY);
}

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => queryCoarse()?.matches ?? false);
  useEffect(() => {
    const mql = queryCoarse();
    if (!mql) return;
    const onChange = (): void => setCoarse(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return coarse;
}

function useReducedMotionQuery(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mql) return;
    const onChange = (): void => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function useProgressInput({
  el,
  spec,
  beats,
  snappable,
  snap,
  testMode,
}: UseProgressInputArgs): ProgressInput {
  const ref = useRef<ProgressController | null>(null);
  if (ref.current === null) ref.current = new ProgressController(beats);
  const controller = ref.current;
  controller.instant = testMode;
  if (testMode) controller.snap();

  const coarse = useCoarsePointer();
  const beatsKey = beats.join(",");

  // biome-ignore lint/correctness/useExhaustiveDependencies: beatsKey tracks beat values, not array identity
  const snappableKey = (snappable ?? []).join(",");

  // biome-ignore lint/correctness/useExhaustiveDependencies: keys track values, not array identity
  useEffect(() => {
    controller.setBeats(beats, snappable);
  }, [controller, beatsKey, snappableKey]);

  const reduced = useReducedMotionQuery();
  controller.snapConfig = resolveSnapSettings(snap, coarse, testMode);
  controller.snapInstantly = reduced;

  const kindsKey = resolveInputs(spec, coarse).join(",");
  const wheelMultiplier = spec?.wheelMultiplier;
  const touchMultiplier = spec?.touchMultiplier;

  useEffect(() => {
    if (!el) return;
    const kinds = kindsKey ? (kindsKey.split(",") as InputKind[]) : [];
    return attachInputs(el, controller, kinds, { wheelMultiplier, touchMultiplier });
  }, [el, controller, kindsKey, wheelMultiplier, touchMultiplier]);

  const smoothing = testMode ? 0 : (spec?.smoothing ?? DEFAULT_SMOOTHING);
  const tick = useCallback((dt: number) => controller.tick(dt, smoothing), [controller, smoothing]);
  const getProgress = useCallback(() => controller.value, [controller]);

  return { controller, getProgress, tick };
}
