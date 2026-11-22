import type { InputKind, InputSpec } from "../choreography/types.js";

const DEFAULT_INPUTS: InputKind[] = ["scroll"];

export function resolveInputs(spec: InputSpec | undefined, coarse: boolean): InputKind[] {
  const listed = (coarse ? spec?.coarse : spec?.fine) ?? DEFAULT_INPUTS;
  const kinds = [...new Set(listed)];
  // Native scroll already handles wheel and touch, so "scroll" wins and virtual wheel/touch are dropped.
  if (kinds.includes("scroll")) return kinds.filter((k) => k !== "wheel" && k !== "touch");
  return kinds;
}
