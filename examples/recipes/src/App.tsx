import { DoodleyA11y } from "@doodley/a11y";
import type { DoodleyConfig } from "@doodley/core";
import { DoodleySite, getRecipe, recipeNames, Section } from "@doodley/core";

const MAX_SECTIONS = 12;
const params = new URLSearchParams(window.location.search);
const recipe = getRecipe(params.get("recipe") ?? "fly-through");
if (!recipe) throw new Error(`Unknown recipe. Use one of: ${recipeNames.join(", ")}`);
const count = Math.min(Math.max(Number(params.get("sections")) || 3, 1), MAX_SECTIONS);

const sections = Array.from({ length: count }, (_, i) => ({
  id: `s${i + 1}`,
  title: `Section ${i + 1}`,
}));
const config: DoodleyConfig = {
  name: `Recipe: ${recipe.name}`,
  sections,
  choreography: recipe.create(sections.map((s) => s.id)),
};

export function App(): JSX.Element {
  return (
    <DoodleySite config={config} overlay={<DoodleyA11y config={{ sections }} />}>
      {sections.map((s, i) => (
        <Section
          key={s.id}
          id={s.id}
          title={s.title}
          html={
            <>
              {i === 0 ? <h1>{recipe.name}</h1> : <h2>{s.title}</h2>}
              <p>{recipe.description}</p>
            </>
          }
        >
          <mesh>
            <planeGeometry args={[2.4, 1.4]} />
            <meshStandardMaterial color={`hsl(${(i * 47) % 360}, 55%, 22%)`} />
          </mesh>
        </Section>
      ))}
      {recipe.name === "orbit-product" && (
        <mesh name="product" position={[0, 0.3, 0]}>
          <icosahedronGeometry args={[0.8, 1]} />
          <meshStandardMaterial color="#6b4f10" />
        </mesh>
      )}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </DoodleySite>
  );
}
