import { DoodleySite } from "@doodley/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Fixture, Head } from "./fixture.js";
import { good } from "./good.js";

const loaders = import.meta.glob<{ fixture: Fixture }>([
  "../../broken/*/fixture.tsx",
  "../../e2e/*/fixture.tsx",
]);

function applyHead({ title, description }: Head): void {
  document.title = title ?? "";
  document.querySelector('meta[name="description"]')?.remove();
  if (description) {
    const meta = document.createElement("meta");
    meta.name = "description";
    meta.content = description;
    document.head.append(meta);
  }
}

async function loadFixture(name: string | null): Promise<Fixture> {
  if (!name || name === "good") return good;
  const loader =
    loaders[`../../broken/${name}/fixture.tsx`] ?? loaders[`../../e2e/${name}/fixture.tsx`];
  if (!loader) throw new Error(`Unknown fixture "${name}"`);
  return (await loader()).fixture;
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("No #root element found");

const fixture = await loadFixture(new URLSearchParams(location.search).get("fixture"));
applyHead(fixture.head ?? good.head ?? {});
const Scene = fixture.Scene;

createRoot(rootEl).render(
  <StrictMode>
    <DoodleySite
      config={fixture.config}
      brand={fixture.brand}
      overlay={fixture.overlay}
      fallback={fixture.fallback}
    >
      {Scene ? <Scene /> : null}
    </DoodleySite>
  </StrictMode>,
);
