import type { Group, Material, Mesh, Object3D, Quaternion, Vector3 } from "three";
import { fadedOpacity } from "../choreography/reduced.js";

interface Home {
  position: Vector3;
  quaternion: Quaternion;
}

interface FadeMemory {
  opacity: number;
  transparent: boolean;
}

/** Kept off userData because React Three Fiber replaces userData when a parent re-renders. */
const homes = new WeakMap<Group, Home>();
const fades = new WeakMap<Material, FadeMemory>();

function sectionGroup(scene: Object3D, id: string): Group | undefined {
  return scene.getObjectByName(`section-${id}`) as Group | undefined;
}

function materialsOf(group: Object3D): Material[] {
  const found = new Set<Material>();
  group.traverse((o) => {
    const material = (o as Mesh).material as Material | Material[] | undefined;
    if (Array.isArray(material)) for (const m of material) found.add(m);
    else if (material) found.add(material);
  });
  return [...found];
}

function homeOf(group: Group): Home {
  const known = homes.get(group);
  if (known) return known;
  const home = { position: group.position.clone(), quaternion: group.quaternion.clone() };
  homes.set(group, home);
  return home;
}

function setFade(material: Material, weight: number): void {
  const memory = fades.get(material) ?? {
    opacity: material.opacity,
    transparent: material.transparent,
  };
  fades.set(material, memory);
  const transparent = memory.transparent || weight < 1;
  if (material.transparent !== transparent) {
    material.transparent = transparent;
    material.needsUpdate = true;
  }
  material.opacity = fadedOpacity(memory.opacity, weight);
}

/**
 * Puts every section group on the first section's placement and fades each by its weight.
 * Groups at zero weight are hidden so they cost nothing to draw.
 */
export function applyStage(scene: Object3D, ids: string[], weights: number[]): void {
  const groups = ids.map((id) => sectionGroup(scene, id));
  const first = groups[0];
  if (!first) return;
  const stage = homeOf(first);
  groups.forEach((group, i) => {
    if (!group) return;
    homeOf(group);
    group.position.copy(stage.position);
    group.quaternion.copy(stage.quaternion);
    const weight = weights[i] ?? 0;
    group.visible = weight > 0;
    for (const material of materialsOf(group)) setFade(material, weight);
  });
}

/** Puts every section group back where it was and restores its materials. */
export function restoreStage(scene: Object3D, ids: string[]): void {
  for (const id of ids) {
    const group = sectionGroup(scene, id);
    if (!group) continue;
    const home = homes.get(group);
    if (home) {
      group.position.copy(home.position);
      group.quaternion.copy(home.quaternion);
      homes.delete(group);
    }
    group.visible = true;
    for (const material of materialsOf(group)) {
      const memory = fades.get(material);
      if (!memory) continue;
      material.opacity = memory.opacity;
      if (material.transparent !== memory.transparent) {
        material.transparent = memory.transparent;
        material.needsUpdate = true;
      }
      fades.delete(material);
    }
  }
}
