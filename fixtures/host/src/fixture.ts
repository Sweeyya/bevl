import type { BrandTokens, DoodleyConfig } from "@doodley/core";
import type { ComponentType, ReactNode } from "react";

export interface Head {
  title?: string | null;
  description?: string | null;
}

export interface Fixture {
  config: DoodleyConfig;
  overlay?: ReactNode;
  Scene?: ComponentType;
  head?: Head;
  brand?: BrandTokens | undefined;
}
