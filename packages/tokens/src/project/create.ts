import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { parseMd } from "../parse-md.js";

export interface CreateOptions {
  name: string;
  dir: string;
}

const SITE_NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;

export function validateSiteName(name: string): string {
  if (!SITE_NAME.test(name)) {
    throw new Error(
      `Invalid site name "${name}". Fix: use 1-64 letters, numbers, spaces, dashes or underscores, starting with a letter or number.`,
    );
  }
  return name;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    <title>${escapeHtml(name)}</title>
    <meta name="description" content="${escapeHtml(name)} — built with Bevl" />
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

const DEFAULT_APP = `import { BevlA11y } from "@bevl/a11y";
import { BevlSite, Section } from "@bevl/core";
import brand from "./brand.tokens.json";
import config from "../bevl.json";

export default function App() {
  return (
    <BevlSite
      config={config}
      brand={brand}
      overlay={<BevlA11y config={{ sections: config.sections }} />}
    >
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
    </BevlSite>
  );
}
`;

const DEFAULT_VITE_CONFIG = `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react()] });
`;

const DEFAULT_TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      strict: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      noEmit: true,
    },
    include: ["src", "vite.config.ts"],
  },
  null,
  2,
);

const packageName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const DEFAULT_PACKAGE = (name: string) =>
  JSON.stringify(
    {
      name: packageName(name),
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: {
        "@bevl/a11y": "0.1.0",
        "@bevl/core": "0.1.0",
        react: "18.3.1",
        "react-dom": "18.3.1",
        three: "0.169.0",
      },
      devDependencies: {
        "@types/react": "18.3.12",
        "@types/react-dom": "18.3.1",
        "@vitejs/plugin-react": "4.3.4",
        typescript: "7.0.2",
        vite: "6.4.5",
      },
    },
    null,
    2,
  );

export async function createSite(opts: CreateOptions): Promise<void> {
  const name = validateSiteName(opts.name);
  const parent = resolve(opts.dir);
  const base = resolve(parent, name);
  if (!base.startsWith(parent + sep)) throw new Error(`Site folder would be outside ${parent}.`);
  if (existsSync(join(base, "bevl.json"))) {
    throw new Error(`A Bevl site already exists at ${base}. Fix: choose a different name.`);
  }
  await mkdir(join(base, "src"), { recursive: true });
  await writeFile(join(base, "bevl.json"), DEFAULT_CONFIG(name));
  await writeFile(join(base, "index.html"), DEFAULT_HTML(name));
  await writeFile(join(base, "vite.config.ts"), DEFAULT_VITE_CONFIG);
  await writeFile(join(base, "package.json"), `${DEFAULT_PACKAGE(name)}\n`);
  await writeFile(join(base, "tsconfig.json"), `${DEFAULT_TSCONFIG}\n`);
  await writeFile(
    join(base, "src", "brand.tokens.json"),
    `${JSON.stringify(parseMd(""), null, 2)}\n`,
  );
  await writeFile(join(base, "src", "main.tsx"), DEFAULT_MAIN);
  await writeFile(join(base, "src", "App.tsx"), DEFAULT_APP);
}
