import { useBrand } from "../brand.js";

export function BrandLights({ intensity = 1 }: { intensity?: number }): JSX.Element {
  const { colors } = useBrand();
  return (
    <>
      <ambientLight color={colors.surface} intensity={0.6 * intensity} />
      <directionalLight color={colors.text} position={[5, 10, 5]} intensity={intensity} />
    </>
  );
}
