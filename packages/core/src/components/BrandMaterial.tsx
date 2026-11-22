import type { BrandRole } from "../brand.js";
import { useBrand } from "../brand.js";

type StandardProps = JSX.IntrinsicElements["meshStandardMaterial"];

interface BrandMaterialProps extends Omit<StandardProps, "color"> {
  role: BrandRole;
}

export function BrandMaterial({ role, name, ...rest }: BrandMaterialProps): JSX.Element {
  const { colors } = useBrand();
  return <meshStandardMaterial name={name ?? `brand-${role}`} color={colors[role]} {...rest} />;
}
