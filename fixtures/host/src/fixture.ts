import type { BevlConfig, BrandTokens } from "@bevl/core";
import type { ComponentType, ReactNode } from "react";

export interface Head {
  title?: string | null;
  description?: string | null;
}

export interface Fixture {
  config: BevlConfig;
  overlay?: ReactNode;
  Scene?: ComponentType;
  fallback?: ReactNode;
  head?: Head;
  brand?: BrandTokens | undefined;
}
