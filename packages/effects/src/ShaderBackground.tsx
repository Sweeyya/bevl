import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface ShaderBackgroundProps {
  colorA?: string;
  colorB?: string;
  speed?: number;
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec3 colorA;
uniform vec3 colorB;
uniform float time;
varying vec2 vUv;

void main() {
  float t = vUv.y + sin(vUv.x * 3.14159 + time * 0.3) * 0.1;
  gl_FragColor = vec4(mix(colorA, colorB, t), 1.0);
}
`;

export function ShaderBackground({
  colorA = "#0a0a1a",
  colorB = "#1a1a3a",
  speed = 1.0,
}: ShaderBackgroundProps): JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  const uniforms = useRef({
    colorA: { value: new THREE.Color(colorA) },
    colorB: { value: new THREE.Color(colorB) },
    time: { value: 0 },
  });

  useFrame((_, delta) => {
    if (matRef.current) {
      uniforms.current.time.value += delta * speed;
    }
    // Keep background behind everything by placing it at the near plane
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
      meshRef.current.quaternion.copy(camera.quaternion);
      meshRef.current.translateZ(-0.5);
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <planeGeometry args={[4, 4]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
        depthWrite={false}
      />
    </mesh>
  );
}
