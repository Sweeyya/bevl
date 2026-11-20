/**
 * ScrollCamera reads scroll progress from DoodleyContext, calls
 * cameraPath.lerp(scrollProgress) to get the target pose, and applies it
 * to the R3F camera each frame. Enforces no-roll and speed limit per update.
 *
 * Speed/turn clamping and no-roll enforcement mirror the design rules in
 * index.ts (DESIGN_RULES) and the pure-math helpers in camera/path.ts.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useContext, useRef } from "react";
import { clampStep, enforceNoRoll } from "../camera/path.js";
import { DoodleyContext } from "../context.js";
import type { Pose } from "../contract.js";
import { DESIGN_RULES } from "../index.js";

function poseFromCamera(camera: {
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
}): Pose {
  return {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
    quaternion: {
      x: camera.quaternion.x,
      y: camera.quaternion.y,
      z: camera.quaternion.z,
      w: camera.quaternion.w,
    },
  };
}

export function ScrollCamera(): null {
  const ctx = useContext(DoodleyContext);
  const { camera, invalidate } = useThree();
  const prevPoseRef = useRef<Pose | null>(null);

  useFrame(() => {
    if (!ctx) return;

    const target = ctx.cameraPath.lerp(ctx.scrollProgress);

    // On first frame, seed prevPose from the camera's current state
    const prevPose: Pose = prevPoseRef.current ?? poseFromCamera(camera);

    // Enforce speed and turn limits
    const clamped = clampStep(
      prevPose,
      target,
      DESIGN_RULES.MAX_MOVE_PER_STEP_M,
      DESIGN_RULES.MAX_TURN_PER_STEP_DEG,
    );

    // Enforce no-roll
    const safeQuat = enforceNoRoll(clamped.quaternion, DESIGN_RULES.MAX_ROLL_DEG);
    const safePose: Pose = { position: clamped.position, quaternion: safeQuat };

    camera.position.set(safePose.position.x, safePose.position.y, safePose.position.z);
    camera.quaternion.set(
      safePose.quaternion.x,
      safePose.quaternion.y,
      safePose.quaternion.z,
      safePose.quaternion.w,
    );

    prevPoseRef.current = safePose;
    invalidate();
  });

  return null;
}
