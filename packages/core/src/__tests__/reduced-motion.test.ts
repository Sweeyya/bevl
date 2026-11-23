import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Scene } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearBehaviors, registerBehavior } from "../choreography/behaviors.js";
import { defaultChoreography } from "../choreography/default.js";
import { cameraPoseAt } from "../choreography/pose.js";
import {
  fadedOpacity,
  fadeWeights,
  keepsFullMotion,
  reducedChoreography,
} from "../choreography/reduced.js";
import { validateChoreography } from "../choreography/schema.js";
import type { Choreography } from "../choreography/types.js";
import { prefersReducedMotion, useReducedMotion } from "../motion/preference.js";
import { applyStage, restoreStage } from "../motion/stage.js";

const IDS = ["a", "b", "c"];
const flight: Choreography = {
  ...defaultChoreography(IDS),
  tracks: [
    {
      target: "camera",
      prop: "position",
      keys: [
        { at: 0, value: [0, 1, 8] },
        { at: 1, value: [0, 1, -12] },
      ],
    },
    {
      target: "spinner",
      prop: "rotation.y",
      keys: [
        { at: 0, value: 0 },
        { at: 1, value: 3 },
      ],
    },
  ],
  behaviors: ["wobble"],
};

afterEach(() => {
  clearBehaviors();
  vi.unstubAllGlobals();
});

describe("reducedMotion in the schema", () => {
  const check = (reducedMotion: unknown) =>
    validateChoreography({ ...defaultChoreography(IDS), reducedMotion }, IDS);

  it("accepts modes, extra tracks and registered behaviors", () => {
    registerBehavior("calm", () => {});
    expect(check({}).ok).toBe(true);
    expect(check({ mode: "none" }).ok).toBe(true);
    expect(
      check({
        mode: "fade",
        behaviors: ["calm"],
        tracks: [
          {
            target: "camera",
            prop: "position",
            keys: [{ at: 0, value: [0, 0, 5] }],
          },
        ],
      }).ok,
    ).toBe(true);
  });

  it("accepts allow.reducedMotion", () => {
    const result = validateChoreography(
      { ...defaultChoreography(IDS), allow: { reducedMotion: true } },
      IDS,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown mode with a Fix", () => {
    const result = check({ mode: "slow" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("reducedMotion.mode");
      expect(result.errors[0]).toContain('Fix: use one of "fade", "none"');
    }
  });

  it("rejects unknown keys", () => {
    const result = check({ speed: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('Fix: remove "speed"');
  });

  it("holds extra tracks to the normal track rules", () => {
    const result = check({
      tracks: [{ target: "camera", prop: "color", keys: [{ at: 0, value: 1 }] }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("reducedMotion.tracks[0].prop");
      expect(result.errors[0]).toContain("Fix:");
    }
  });

  it("names unregistered behaviors", () => {
    const result = check({ behaviors: ["nope"] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('reducedMotion.behaviors[0] "nope"');
  });
});

describe("reducedChoreography", () => {
  it("freezes the camera at its start pose and drops object tracks and behaviors", () => {
    const reduced = reducedChoreography(flight);
    expect(reduced.tracks).toEqual([]);
    expect(reduced.behaviors).toEqual([]);
    const start = cameraPoseAt(flight, 0);
    for (const p of [0, 0.4, 1]) expect(cameraPoseAt(reduced, p)).toEqual(start);
  });

  it("keeps the fov of the start pose", () => {
    const withFov: Choreography = {
      ...flight,
      tracks: [
        ...(flight.tracks ?? []),
        {
          target: "camera",
          prop: "fov",
          keys: [
            { at: 0, value: 40 },
            { at: 1, value: 90 },
          ],
        },
      ],
    };
    expect(cameraPoseAt(reducedChoreography(withFov), 1).fov).toBe(40);
  });

  it("runs the author's extra tracks and behaviors, camera tracks included", () => {
    const dolly = {
      target: "camera",
      prop: "position",
      keys: [
        { at: 0, value: [0, 1, 8] as [number, number, number] },
        { at: 1, value: [0, 1, 7.9] as [number, number, number] },
      ],
    };
    const reduced = reducedChoreography({
      ...flight,
      reducedMotion: { tracks: [dolly], behaviors: ["wobble"] },
    });
    expect(reduced.tracks).toEqual([dolly]);
    expect(reduced.behaviors).toEqual(["wobble"]);
    expect(cameraPoseAt(reduced, 1).position.z).toBeCloseTo(7.9);
  });

  it('keepsFullMotion is only true for mode "none"', () => {
    expect(keepsFullMotion(flight)).toBe(false);
    expect(keepsFullMotion({ ...flight, reducedMotion: { mode: "fade" } })).toBe(false);
    expect(keepsFullMotion({ ...flight, reducedMotion: { mode: "none" } })).toBe(true);
  });
});

describe("fade weights", () => {
  const beats = [0, 0.5, 1];

  it("is 1 on a beat and 0 for the others", () => {
    expect(fadeWeights(0.5, beats)).toEqual([0, 1, 0]);
    expect(fadeWeights(1, beats)).toEqual([0, 0, 1]);
  });

  it("cross-fades between beats", () => {
    const [a, b, c] = fadeWeights(0.35, beats);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
    expect(b).toBeGreaterThan(0);
    expect(c).toBe(0);
  });

  it("scales the original opacity and clamps the weight", () => {
    expect(fadedOpacity(0.8, 0.5)).toBeCloseTo(0.4);
    expect(fadedOpacity(0.8, 1)).toBe(0.8);
    expect(fadedOpacity(0.8, 2)).toBe(0.8);
    expect(fadedOpacity(0.8, -1)).toBe(0);
  });
});

describe("stage", () => {
  function build(): { scene: Scene; groups: Group[]; materials: MeshStandardMaterial[] } {
    const scene = new Scene();
    const groups: Group[] = [];
    const materials: MeshStandardMaterial[] = [];
    IDS.forEach((id, i) => {
      const group = new Group();
      group.name = `section-${id}`;
      group.position.set(0, 0, 0 - 10 * i);
      group.rotation.y = i * 0.5;
      const material = new MeshStandardMaterial({ opacity: i === 1 ? 0.5 : 1 });
      group.add(new Mesh(new BoxGeometry(), material));
      scene.add(group);
      groups.push(group);
      materials.push(material);
    });
    return { scene, groups, materials };
  }

  it("moves every section to the first one's placement and fades by weight", () => {
    const { scene, groups, materials } = build();
    applyStage(scene, IDS, [0.25, 1, 0]);
    for (const g of groups) {
      expect(g.position.toArray()).toEqual([0, 0, 0]);
      expect(g.quaternion.angleTo(groups[0]?.quaternion ?? g.quaternion)).toBe(0);
    }
    expect(groups.map((g) => g.visible)).toEqual([true, true, false]);
    expect(materials[0]?.opacity).toBeCloseTo(0.25);
    expect(materials[0]?.transparent).toBe(true);
    expect(materials[1]?.opacity).toBeCloseTo(0.5);
    expect(materials[2]?.opacity).toBe(0);
  });

  it("restores placement, visibility and original material opacity", () => {
    const { scene, groups, materials } = build();
    applyStage(scene, IDS, [0.25, 1, 0]);
    applyStage(scene, IDS, [0, 0.5, 1]);
    restoreStage(scene, IDS);
    expect(groups.map((g) => g.position.z + 0)).toEqual([0, -10, -20]);
    expect(groups.map((g) => g.rotation.y)).toEqual([0, 0.5, 1]);
    expect(groups.every((g) => g.visible)).toBe(true);
    expect(materials.map((m) => m.opacity)).toEqual([1, 0.5, 1]);
    expect(materials.every((m) => !m.transparent)).toBe(true);
  });
});

function Probe(): JSX.Element {
  return createElement("i", null, String(useReducedMotion()));
}

describe("reduced-motion preference", () => {
  const stub = (matches: boolean): void => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: matches && query.includes("reduce"),
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
  };

  it("is false without a window", () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it("reads the media query", () => {
    stub(true);
    expect(prefersReducedMotion()).toBe(true);
    stub(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("renders on the server and follows the query", () => {
    const render = (): string => renderToStaticMarkup(createElement(Probe));
    expect(render()).toBe("<i>false</i>");
    stub(true);
    expect(render()).toBe("<i>true</i>");
  });
});
