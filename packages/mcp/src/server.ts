#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { VERSION } from "./index.js";
import { dealArtDirectionTool, validateBriefTool } from "./taste.js";
import {
  addSectionTool,
  applyBrandTool,
  checkSite,
  createSiteTool,
  optimizeAssets,
  readBrandTokens,
} from "./tools.js";

const server = new McpServer({
  name: "toros",
  version: VERSION,
});

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

server.tool(
  "check_site",
  "Open a local dev server URL (localhost by default) in a headless browser, run the Toros checks, and return a scored report (0-100). Writes a report file under <projectDir>/.toros/reports.",
  {
    url: z.string().max(2048).describe("URL of the running site, e.g. http://localhost:3000"),
    projectDir: z
      .string()
      .max(1024)
      .optional()
      .describe("Project folder, relative to the project root (default: the root)"),
    seed: z
      .number()
      .int()
      .min(0)
      .max(2147483647)
      .optional()
      .describe("Seed for deterministic runs (default 1)"),
    viewport: z.enum(["desktop", "phone"]).optional().describe("Run only this viewport"),
    ruleId: z
      .string()
      .max(128)
      .regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)
      .optional()
      .describe("Run only this rule id, e.g. scroll/no-jumps"),
  },
  async (args) => text(await checkSite(args)),
);

server.tool(
  "optimize_assets",
  "Shrink a .glb file inside the project with glTF Transform. Writes the result to output (default: <input>-optimized.glb); never writes outside the project root.",
  {
    input: z.string().max(1024).describe("Path to the input .glb, relative to the project root"),
    output: z.string().max(1024).optional().describe("Output .glb path inside the project root"),
    textureSize: z
      .number()
      .int()
      .min(64)
      .max(4096)
      .optional()
      .describe("Max texture size in px (default 1024)"),
  },
  async (args) => text(await optimizeAssets(args)),
);

server.tool(
  "read_brand_tokens",
  "Read a DESIGN.md or design-tokens .json file inside the project and return parsed brand tokens. Read-only.",
  {
    filePath: z
      .string()
      .max(1024)
      .describe("Path to the .md or .json file, relative to the project root"),
  },
  async ({ filePath }) => text(await readBrandTokens(filePath)),
);

const projectDir = z
  .string()
  .max(1024)
  .optional()
  .describe("Project folder, relative to the project root (default: the root)");

server.tool(
  "create_site",
  "Scaffold a new Toros site in <dir>/<name> (dir defaults to the project root). Writes toros.json, package.json, tsconfig.json, vite.config.ts, index.html and src/{main,App}.tsx plus src/brand.tokens.json (default tokens). Refuses to overwrite an existing site; never writes outside the project root.",
  {
    name: z
      .string()
      .max(64)
      .describe("Site name: letters, numbers, spaces, dashes or underscores; becomes the folder"),
    dir: z
      .string()
      .max(1024)
      .optional()
      .describe("Parent folder, relative to the project root (default: the root)"),
  },
  async (args) => text(await createSiteTool(args)),
);

server.tool(
  "add_section",
  "Add a section to a Toros project: appends it to toros.json (and a beat to its choreography, rescaling existing beats) and inserts a placeholder <Section> before <ambientLight in src/App.tsx when that line exists. Refuses duplicate ids. Edits only toros.json and src/App.tsx inside the project.",
  {
    id: z
      .string()
      .max(40)
      .regex(/^[a-z][a-z0-9-]*$/)
      .describe("Section id: lowercase letters, numbers, dashes, starting with a letter"),
    title: z.string().min(1).max(80).describe("Section title shown in navigation"),
    projectDir,
  },
  async (args) => text(await addSectionTool(args)),
);

server.tool(
  "apply_brand",
  'Parse a DESIGN.md or token .json file inside the project, write the tokens to <projectDir>/src/brand.tokens.json and set "brand" in toros.json to the file\'s relative path. Edits only those two files.',
  {
    file: z
      .string()
      .max(1024)
      .describe("Path to the .md or .json file, relative to the project root"),
    projectDir,
  },
  async (args) => text(await applyBrandTool(args)),
);

server.tool(
  "validate_brief",
  "Check a toros.brief.json file inside the project. Returns every problem with a Fix line, or says the brief is valid. Read-only.",
  { file: z.string().max(1024).describe("Path to the brief .json, relative to the project root") },
  async (args) => text(await validateBriefTool(args)),
);

server.tool(
  "deal_art_direction",
  "Deal one of Toros's own art directions (palette, fonts, material and lighting mood, scroll styles, motion) for a brief, for sites with no brand. Deterministic for a seed and avoids directions in the brief history. With apply=true it writes src/brand.tokens.json and records direction and history in toros.brief.json.",
  {
    briefFile: z
      .string()
      .max(1024)
      .describe("Path to the brief .json, relative to the project root"),
    seed: z.number().int().min(0).max(2147483647).optional().describe("Seed (default 1)"),
    apply: z.boolean().optional().describe("Write the tokens and update the brief"),
    projectDir,
  },
  async (args) => text(await dealArtDirectionTool(args)),
);

await server.connect(new StdioServerTransport());
