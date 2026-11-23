import { TorosA11y } from "@toros/a11y";
import type { TorosConfig } from "@toros/core";
import {
  BackdropLights,
  getRecipe,
  recipeNames,
  ScreenFrame,
  Section,
  TorosSite,
  useBrand,
  useWorldPlan,
  World,
} from "@toros/core";
import { brands } from "./brands.js";

const params = new URLSearchParams(window.location.search);
const recipe = getRecipe(params.get("recipe") ?? "room");
if (!recipe) throw new Error(`Unknown recipe. Use one of: ${recipeNames.join(", ")}`);
const brand = brands[params.get("brand") ?? "dark"] ?? brands.dark;

const copy = [
  {
    id: "arrive",
    title: "Arrive at the station",
    body: "A night-shift observatory for people who like their sky slow. Doors open at dusk.",
  },
  {
    id: "scopes",
    title: "Three telescopes, one rule",
    body: "Look first, ask later. Guides stand by each eyepiece with warm tea and star charts.",
  },
  {
    id: "nights",
    title: "Clear nights, booked small",
    body: "Groups of eight so everyone gets a turn at the eyepiece. Cancel up to noon, free.",
  },
  {
    id: "visit",
    title: "Find the dome",
    body: "Take the hill road past the water tower. Park by the green gate and follow the lamps.",
  },
];
const sections = copy.map(({ id, title }) => ({ id, title }));
const config: TorosConfig = {
  name: "Tidewater Observatory",
  sections,
  choreography: recipe.create(sections.map((s) => s.id)),
};

const SHAPES = ["icosahedron", "octahedron", "torus", "cone"] as const;

function Decor({ index }: { index: number }): JSX.Element {
  const { colors } = useBrand();
  const { frame } = useWorldPlan();
  const size = Math.min(frame.height * 0.2, 0.55);
  const shape = SHAPES[index % SHAPES.length];
  return (
    <mesh position={[frame.width * 0.36, frame.height * 0.22, 0.3]} rotation={[0.5, 0.6, 0]}>
      {shape === "icosahedron" && <icosahedronGeometry args={[size, 0]} />}
      {shape === "octahedron" && <octahedronGeometry args={[size, 0]} />}
      {shape === "torus" && <torusGeometry args={[size, size * 0.35, 12, 24]} />}
      {shape === "cone" && <coneGeometry args={[size * 0.8, size * 1.8, 16]} />}
      <meshStandardMaterial
        name="brand-primary"
        color={colors.primary}
        emissive={colors.primary}
        emissiveIntensity={0.35}
        roughness={0.5}
      />
    </mesh>
  );
}

export function App(): JSX.Element {
  const inside = recipe.name === "room" || recipe.name === "sphere-of-screens";
  return (
    <TorosSite config={config} brand={brand} overlay={<TorosA11y config={{ sections }} />}>
      <World />
      <BackdropLights inside={inside} />
      {copy.map((s, i) => (
        <Section
          key={s.id}
          id={s.id}
          title={s.title}
          html={
            <>
              {i === 0 ? <h1>{s.title}</h1> : <h2>{s.title}</h2>}
              <p>{s.body}</p>
            </>
          }
        >
          <ScreenFrame>
            <Decor index={i} />
          </ScreenFrame>
        </Section>
      ))}
      {recipe.name === "orbit-product" && (
        <mesh name="product" position={[0, 0.3, 0]}>
          <icosahedronGeometry args={[0.8, 1]} />
          <meshStandardMaterial
            name="brand-primary"
            color={brand.colors.primary}
            emissive={brand.colors.primary}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </TorosSite>
  );
}
