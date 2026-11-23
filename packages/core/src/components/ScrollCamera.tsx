/**
 * Applies the choreography at the current progress every frame: camera pose
 * (with the speed, turn and no-roll limits unless `allow` opts out), layouts,
 * tracks on named objects, then registered behaviors. With reduced motion on it holds
 * the camera still, stages the sections on one spot and cross-fades them (docs/adr/005).
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useContext, useMemo, useRef } from "react";
import { type Camera, type Object3D, type PerspectiveCamera, Vector3 } from "three";
import { clampStep, enforceNoRoll } from "../camera/path.js";
import { setProp } from "../choreography/apply.js";
import { getBehavior } from "../choreography/behaviors.js";
import { evaluateTrack } from "../choreography/evaluate.js";
import { layoutPositions, type Placement } from "../choreography/layout.js";
import { cameraPoseAt } from "../choreography/pose.js";
import { fadeWeights, keepsFullMotion, reducedChoreography } from "../choreography/reduced.js";
import { SECTIONS_LAYOUT } from "../choreography/scene.js";
import type { Choreography } from "../choreography/types.js";
import { BevlContext } from "../context.js";
import type { Pose } from "../contract.js";
import { DESIGN_RULES } from "../index.js";
import { applyStage, restoreStage } from "../motion/stage.js";
import { makeRand } from "../rand.js";

const BEHAVIOR_SEED = 1;
const scratch = new Vector3();

function poseFromCamera(camera: Camera): Pose {
  const { position: p, quaternion: q } = camera;
  return { position: { x: p.x, y: p.y, z: p.z }, quaternion: { x: q.x, y: q.y, z: q.z, w: q.w } };
}

function applyLayouts(
  choreo: Choreography,
  scene: Object3D,
  camera: Camera,
  cache: Map<string, Placement[]>,
): void {
  for (const [id, spec] of Object.entries(choreo.layouts ?? {})) {
    if (id === SECTIONS_LAYOUT) continue;
    const group = scene.getObjectByName(id);
    if (!group) continue;
    const key = `${id}:${group.children.length}`;
    let placements = cache.get(key);
    if (!placements) {
      placements = layoutPositions(spec, group.children.length);
      cache.set(key, placements);
    }
    group.children.forEach((child, i) => {
      const placement = placements[i];
      if (!placement) return;
      child.position.fromArray(placement.position);
      if (placement.lookAt) child.lookAt(group.localToWorld(scratch.fromArray(placement.lookAt)));
      else if ((spec.facing ?? "camera") === "camera") child.lookAt(camera.position);
    });
  }
}

function applyTracks(choreo: Choreography, scene: Object3D, progress: number): void {
  for (const track of choreo.tracks ?? []) {
    if (track.target === "camera") continue;
    const object = scene.getObjectByName(track.target);
    if (object) setProp(object, track.prop, evaluateTrack(track, progress));
  }
}

function runBehaviors(
  choreo: Choreography,
  scene: Object3D,
  camera: Camera,
  progress: number,
): void {
  (choreo.behaviors ?? []).forEach((name, i) => {
    getBehavior(name)?.(progress, {
      getObject: (n) => scene.getObjectByName(n),
      camera,
      rand: makeRand(BEHAVIOR_SEED + i),
    });
  });
}

export function ScrollCamera(): null {
  const ctx = useContext(BevlContext);
  const { camera, scene, invalidate } = useThree();
  const prevPoseRef = useRef<Pose | null>(null);
  const layoutCache = useRef(new Map<string, Placement[]>());
  const staged = useRef(false);
  const choreography = ctx?.choreography;
  const reducedChoreo = useMemo(
    () => (choreography ? reducedChoreography(choreography) : null),
    [choreography],
  );

  useFrame((_, delta) => {
    if (!ctx) return;
    ctx.tick(delta);
    const full = ctx.choreography;
    const progress = ctx.getProgress();
    const allow = full.allow ?? {};
    const reduced = ctx.reducedMotion && !keepsFullMotion(full);
    const choreo = reduced && reducedChoreo ? reducedChoreo : full;
    const ids = ctx.sections.map((s) => s.id);

    const target = cameraPoseAt(choreo, progress);
    const clamped = clampStep(
      prevPoseRef.current ?? poseFromCamera(camera),
      target,
      allow.fastMoves ? Number.POSITIVE_INFINITY : DESIGN_RULES.MAX_MOVE_PER_STEP_M,
      allow.spin ? Number.POSITIVE_INFINITY : DESIGN_RULES.MAX_TURN_PER_STEP_DEG,
    );
    const q = allow.roll
      ? clamped.quaternion
      : enforceNoRoll(clamped.quaternion, DESIGN_RULES.MAX_ROLL_DEG);
    camera.position.set(clamped.position.x, clamped.position.y, clamped.position.z);
    camera.quaternion.set(q.x, q.y, q.z, q.w);
    prevPoseRef.current = { position: clamped.position, quaternion: q };

    const perspective = camera as PerspectiveCamera;
    if (perspective.isPerspectiveCamera && perspective.fov !== target.fov) {
      perspective.fov = target.fov;
      perspective.updateProjectionMatrix();
    }

    applyLayouts(choreo, scene, camera, layoutCache.current);
    if (reduced) {
      const weights = fadeWeights(
        progress,
        full.beats.map((b) => b.at),
      );
      applyStage(
        scene,
        ids,
        ids.map((id) => weights[full.beats.findIndex((b) => b.id === id)] ?? 0),
      );
      staged.current = true;
    } else if (staged.current) {
      restoreStage(scene, ids);
      staged.current = false;
    }
    applyTracks(choreo, scene, progress);
    runBehaviors(choreo, scene, camera, progress);
    invalidate();
  });

  return null;
}
