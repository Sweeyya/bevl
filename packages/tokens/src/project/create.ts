import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { parseMd } from "../parse-md.js";
import {
  CONTROL,
  sectionBlock,
  slugifyTitle,
  validateSectionId,
  validateSectionTitle,
} from "./add-section.js";
import { inPnpmWorkspace } from "./workspace.js";

export interface CreateOptions {
  name: string;
  dir: string;
  sections?: string[] | undefined;
  description?: string | undefined;
}

const TOROS_VERSION = "0.1.0";
const MAX_SECTIONS = 20;
const DEFAULT_SECTIONS = ["Hero", "Features", "Contact"];

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

export interface SectionSpec {
  id: string;
  title: string;
}

export function sectionSpecs(titles: string[]): SectionSpec[] {
  if (titles.length < 1 || titles.length > MAX_SECTIONS) {
    throw new Error(`Invalid sections. Fix: give 1-${MAX_SECTIONS} section titles.`);
  }
  const used = new Set<string>();
  return titles.map((raw) => {
    const title = validateSectionTitle(raw.trim());
    const base = slugifyTitle(title);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base.slice(0, 40 - String(n).length - 1)}-${n}`;
    used.add(id);
    return { id: validateSectionId(id), title };
  });
}

const DEFAULT_CONFIG = (name: string, sections: SectionSpec[]) =>
  JSON.stringify({ name, sections }, null, 2);

const defaultDescription = (name: string) => `${name}: an interactive 3D scroll experience.`;

export function validateDescription(description: string): string {
  if (description.length < 1 || description.length > 300 || CONTROL.test(description)) {
    throw new Error("Invalid description. Fix: use 1-300 characters on one line.");
  }
  return description;
}

const DEFAULT_HTML = (name: string, description: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(name)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
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

const DEFAULT_APP = (sections: SectionSpec[]) => `import { TorosA11y } from "@toros/a11y";
import { TorosSite, Section } from "@toros/core";
import brand from "./brand.tokens.json";
import config from "../toros.json";

export default function App() {
  return (
    <TorosSite
      config={config}
      brand={brand}
      overlay={<TorosA11y config={{ sections: config.sections }} />}
    >
${sections.map((s) => sectionBlock("      ", s.id, s.title)).join("\n")}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
    </TorosSite>
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

const DEFAULT_PACKAGE = (name: string, torosRange: string) =>
  JSON.stringify(
    {
      name: packageName(name),
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: {
        "@toros/a11y": torosRange,
        "@toros/core": torosRange,
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

const NOT_PUBLISHED_NOTE =
  "Note: @toros/core and @toros/a11y are not published to npm yet, so pnpm install will fail with a 404 here. Install from a source checkout: either create sites inside the Toros repo (for example examples/<name>, where they resolve through the pnpm workspace), or run `pnpm add link:/path/to/toros/packages/core link:/path/to/toros/packages/a11y` in this folder after building the checkout.";

export async function createSite(opts: CreateOptions): Promise<string[]> {
  const name = validateSiteName(opts.name);
  const sections = sectionSpecs(opts.sections ?? DEFAULT_SECTIONS);
  const description = validateDescription(opts.description ?? defaultDescription(name));
  const parent = resolve(opts.dir);
  const base = resolve(parent, name);
  if (!base.startsWith(parent + sep)) throw new Error(`Site folder would be outside ${parent}.`);
  if (existsSync(join(base, "toros.json"))) {
    throw new Error(`A Toros site already exists at ${base}. Fix: choose a different name.`);
  }
  const workspace = inPnpmWorkspace(base);
  await mkdir(join(base, "src"), { recursive: true });
  await writeFile(join(base, "toros.json"), DEFAULT_CONFIG(name, sections));
  await writeFile(join(base, "index.html"), DEFAULT_HTML(name, description));
  await writeFile(join(base, "vite.config.ts"), DEFAULT_VITE_CONFIG);
  await writeFile(
    join(base, "package.json"),
    `${DEFAULT_PACKAGE(name, workspace ? "workspace:*" : TOROS_VERSION)}\n`,
  );
  await writeFile(join(base, "tsconfig.json"), `${DEFAULT_TSCONFIG}\n`);
  await writeFile(
    join(base, "src", "brand.tokens.json"),
    `${JSON.stringify(parseMd(""), null, 2)}\n`,
  );
  await writeFile(join(base, "src", "main.tsx"), DEFAULT_MAIN);
  await writeFile(join(base, "src", "App.tsx"), DEFAULT_APP(sections));
  return workspace ? [] : [NOT_PUBLISHED_NOTE];
}
