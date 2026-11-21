import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface CreateOptions {
  name: string;
  dir: string;
}

const DEFAULT_CONFIG = (name: string) =>
  JSON.stringify(
    {
      name,
      sections: [
        { id: "hero", title: "Hero" },
        { id: "features", title: "Features" },
        { id: "contact", title: "Contact" },
      ],
    },
    null,
    2,
  );

const DEFAULT_HTML = (name: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    <meta name="description" content="${name} — built with Doodley" />
    <style>* { margin:0; padding:0; box-sizing:border-box; } html,body,#root { height:100%; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const DEFAULT_MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");
createRoot(root).render(<StrictMode><App /></StrictMode>);
`;

const DEFAULT_APP = `import { DoodleySite, Section } from "@doodley/core";
import config from "../doodley.json" assert { type: "json" };

export default function App() {
  return (
    <DoodleySite config={config}>
      <Section id="hero" title="Hero">
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#e94560" />
        </mesh>
      </Section>
      <Section id="features" title="Features">
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#0f3460" />
        </mesh>
      </Section>
      <Section id="contact" title="Contact">
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#16213e" />
        </mesh>
      </Section>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
    </DoodleySite>
  );
}
`;

const DEFAULT_VITE_CONFIG = `import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@doodley/core": resolve(__dirname, "../../packages/core/src/index.ts") },
  },
  server: { fs: { allow: ["../.."] } },
});
`;

export async function createSite(opts: CreateOptions): Promise<void> {
  const base = join(opts.dir, opts.name);
  await mkdir(join(base, "src"), { recursive: true });
  await writeFile(join(base, "doodley.json"), DEFAULT_CONFIG(opts.name));
  await writeFile(join(base, "index.html"), DEFAULT_HTML(opts.name));
  await writeFile(join(base, "vite.config.ts"), DEFAULT_VITE_CONFIG);
  await writeFile(join(base, "src", "main.tsx"), DEFAULT_MAIN);
  await writeFile(join(base, "src", "App.tsx"), DEFAULT_APP);
}
