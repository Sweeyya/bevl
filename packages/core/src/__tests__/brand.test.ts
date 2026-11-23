import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BoxGeometry, Mesh, MeshStandardMaterial, Scene } from "three";
import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND, fontStack, resolveBrand, useBrand } from "../brand.js";
import { BevlContext, type BevlContextValue } from "../context.js";
import { collectMaterials } from "../materials.js";

describe("resolveBrand", () => {
  it("returns defaults when nothing is given", () => {
    expect(resolveBrand()).toEqual(DEFAULT_BRAND);
    expect(resolveBrand(null)).toEqual(DEFAULT_BRAND);
  });

  it("keeps given tokens and fills the rest", () => {
    const brand = resolveBrand({
      colors: { ...DEFAULT_BRAND.colors, primary: "#ff0000", accent: "" },
    });
    expect(brand.colors.primary).toBe("#ff0000");
    expect(brand.colors.accent).toBe(DEFAULT_BRAND.colors.accent);
    expect(brand.fonts).toEqual(DEFAULT_BRAND.fonts);
  });

  it("rejects non-positive spacing", () => {
    expect(resolveBrand({ spacingBase: 0 }).spacingBase).toBe(DEFAULT_BRAND.spacingBase);
    expect(resolveBrand({ radiusBase: 0 }).radiusBase).toBe(0);
  });

  it("adds a system fallback to font stacks", () => {
    expect(fontStack("Inter")).toBe("Inter, system-ui, sans-serif");
  });
});

let probed = "";

function Probe(): null {
  probed = useBrand().colors.primary;
  return null;
}

describe("useBrand", () => {
  it("falls back to defaults outside BevlSite", () => {
    renderToStaticMarkup(createElement(Probe));
    expect(probed).toBe(DEFAULT_BRAND.colors.primary);
  });

  it("reads the brand from context", () => {
    const value = {
      brand: { ...DEFAULT_BRAND, colors: { ...DEFAULT_BRAND.colors, primary: "#123456" } },
    };
    renderToStaticMarkup(
      createElement(
        BevlContext.Provider,
        { value: value as BevlContextValue },
        createElement(Probe),
      ),
    );
    expect(probed).toBe("#123456");
  });
});

describe("collectMaterials", () => {
  it("collects each distinct material once with hex colors", () => {
    const scene = new Scene();
    const shared = new MeshStandardMaterial({ color: "#ff0000", name: "red" });
    const glow = new MeshStandardMaterial({ color: "#00ff00", emissive: "#0000ff" });
    const geometry = new BoxGeometry();
    scene.add(new Mesh(geometry, shared), new Mesh(geometry, shared), new Mesh(geometry, glow));
    expect(collectMaterials(scene)).toEqual([
      { name: "red", colors: ["#ff0000"] },
      { name: "MeshStandardMaterial", colors: ["#00ff00", "#0000ff"] },
    ]);
  });

  it("returns nothing for an empty scene", () => {
    expect(collectMaterials(new Scene())).toEqual([]);
  });
});
