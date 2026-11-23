import type { BrandTokens, TorosConfig } from "@toros/core";
import type { ComponentType, ReactNode } from "react";

export interface Head {
  title?: string | null;
  description?: string | null;
}

export interface Fixture {
  config: TorosConfig;
  overlay?: ReactNode;
  Scene?: ComponentType;
  fallback?: ReactNode;
  head?: Head;
  brand?: BrandTokens | undefined;
}
