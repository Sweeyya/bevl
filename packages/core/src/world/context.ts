import { useThree } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo } from "react";
import { Color, NoToneMapping } from "three";
import type { Choreography } from "../choreography/types.js";
import { TorosContext } from "../context.js";
import { planWorld, type WorldKind, type WorldPlan } from "./plan.js";

export const WorldContext = createContext<WorldPlan | null>(null);

const FALLBACK: Choreography = {
  version: 1,
  beats: [],
  camera: { position: [0, 0, 6], lookAt: [0, 0, 0] },
};

/** The plan from the nearest `World`, or one worked out from the choreography. */
export function useWorldPlan(kind?: WorldKind): WorldPlan {
  const fromWorld = useContext(WorldContext);
  const ctx = useContext(TorosContext);
  return useMemo(() => {
    if (fromWorld && !kind) return fromWorld;
    const ids = ctx?.sections.map((s) => s.id) ?? [];
    return planWorld(ctx?.choreography ?? FALLBACK, ids, kind);
  }, [fromWorld, ctx, kind]);
}

/** Blend two `#rrggbb` colours; `t` 0 gives `a`, 1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const from = new Color(a).getHex();
  const to = new Color(b).getHex();
  const channel = (shift: number): string => {
    const x = (from >> shift) & 255;
    const y = (to >> shift) & 255;
    return Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

/** Brand colours show as authored: ACES tone mapping would wash them out. */
export function useFlatTone(): void {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const before = gl.toneMapping;
    gl.toneMapping = NoToneMapping;
    return () => {
      gl.toneMapping = before;
    };
  }, [gl]);
}
