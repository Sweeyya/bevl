import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface GlassMaterialProps {
  color?: string;
  opacity?: number;
  roughness?: number;
  metalness?: number;
}

export function GlassMaterial({
  color = "#ffffff",
  opacity = 0.15,
  roughness = 0.05,
  metalness = 0.1,
}: GlassMaterialProps): JSX.Element {
  const ref = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(() => {
    if (ref.current) ref.current.needsUpdate = false;
  });

  return (
    <meshPhysicalMaterial
      ref={ref}
      color={color}
      transparent
      opacity={opacity}
      roughness={roughness}
      metalness={metalness}
      transmission={0.8}
      thickness={0.5}
      envMapIntensity={1}
      side={THREE.DoubleSide}
    />
  );
}
