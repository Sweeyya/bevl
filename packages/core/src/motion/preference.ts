import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function query(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(QUERY);
}

/** True when the user asked the system for reduced motion. False without a window (SSR). */
export function prefersReducedMotion(): boolean {
  return query()?.matches === true;
}

/** The reduced-motion preference, updated live when the user changes it. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mql = query();
    if (!mql) return;
    const onChange = (): void => setReduced(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
