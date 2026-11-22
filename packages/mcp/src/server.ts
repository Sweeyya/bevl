#!/usr/bin/env node
import { resolve } from "node:path";
import { formatReport, runCheck } from "@doodley/check";
import { optimizeGlb } from "@doodley/optimizer";
import { readTokenFile } from "@doodley/tokens";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { VERSION } from "./index.js";

const server = new McpServer({
  name: "doodley",
  version: VERSION,
});

server.tool(
  "check_site",
  "Run doodley check against a running site URL. Returns a scored report (0-100).",
  {
    url: z.string().describe("The URL of the running site to check"),
    projectDir: z.string().optional().describe("Absolute path to the project root"),
    seed: z.number().optional().describe("Random seed for deterministic runs (default 1)"),
    viewport: z.string().optional().describe("Run only this viewport: desktop or phone"),
    ruleId: z.string().optional().describe("Run only this rule id e.g. scroll/no-jumps"),
  },
  async ({ url, projectDir, seed, viewport, ruleId }) => {
    const report = await runCheck({
      url,
      projectDir: resolve(projectDir ?? process.cwd()),
      ...(seed !== undefined && { seed }),
      ...(viewport !== undefined && { viewportName: viewport }),
      ...(ruleId !== undefined && { ruleId }),
    });
    return {
      content: [{ type: "text", text: formatReport(report) }],
    };
  },
);

server.tool(
  "optimize_assets",
  "Shrink a GLB file using glTF Transform. Returns input/output sizes and reduction.",
  {
    input: z.string().describe("Absolute path to the input GLB file"),
    output: z.string().optional().describe("Output path (default: <input>-optimized.glb)"),
    textureSize: z.number().optional().describe("Max texture size in px (default 1024)"),
  },
  async ({ input, output, textureSize }) => {
    const result = await optimizeGlb({
      input,
      ...(output !== undefined && { output }),
      ...(textureSize !== undefined && { textureSize }),
    });
    const pct = (result.reduction * 100).toFixed(1);
    const text =
      `Optimized: ${result.inputPath}\n` +
      `  Input:  ${(result.inputBytes / 1024).toFixed(1)} KB\n` +
      `  Output: ${(result.outputBytes / 1024).toFixed(1)} KB\n` +
      `  Saved:  ${pct}% smaller → ${result.outputPath}`;
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "read_brand_tokens",
  "Read a DESIGN.md or design-tokens JSON file and return parsed brand tokens.",
  {
    filePath: z.string().describe("Absolute path to the brand/token file"),
  },
  async ({ filePath }) => {
    const tokens = await readTokenFile(filePath);
    return {
      content: [{ type: "text", text: JSON.stringify(tokens, null, 2) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
