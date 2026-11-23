import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SERVER = resolve(fileURLToPath(import.meta.url), "../../../dist/server.js");
/** Strings bounded only by a regex, which does not cap their length. Remove an entry once it gets a maxLength. */
const PATTERN_ONLY = new Map<string, string>();
const SECRET = "TOP-SECRET-OUTSIDE-ROOT";

let sandbox = "";
let root = "";
let outside = "";
let client: Client;
let site: Server;
let siteUrl = "";

function tinyGlb(): Buffer {
  const json = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
    bufferViews: [{ buffer: 0, byteLength: 36 }],
    buffers: [{ byteLength: 36 }],
  };
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([
    jsonBytes,
    Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20),
  ]);
  const bin = Buffer.alloc(36);
  for (const [i, v] of [0, 0, 0, 1, 0, 0, 0, 1, 0].entries()) bin.writeFloatLE(v, i * 4);
  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);
  const chunk = (len: number, type: string): Buffer => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(len, 0);
    b.write(type, 4, "ascii");
    return b;
  };
  return Buffer.concat([
    header,
    chunk(jsonChunk.length, "JSON"),
    jsonChunk,
    chunk(bin.length, "BIN\0"),
    bin,
  ]);
}

interface ToolResult {
  isError: boolean;
  text: string;
}

async function call(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    const res = await client.callTool({ name, arguments: args });
    const content = (res.content ?? []) as { type: string; text?: string }[];
    return {
      isError: res.isError === true,
      text: content.map((c) => c.text ?? "").join("\n"),
    };
  } catch (error) {
    return { isError: true, text: error instanceof Error ? error.message : String(error) };
  }
}

function snapshot(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .map(String)
    .sort()
    .map((f) => `${f}:${statSync(join(dir, f)).mtimeMs}:${statSync(join(dir, f)).size}`);
}

beforeAll(async () => {
  if (!existsSync(SERVER))
    throw new Error("packages/mcp/dist/server.js is missing. Run pnpm build first.");
  sandbox = realpathSync(mkdtempSync(join(tmpdir(), "bevl-mcp-e2e-")));
  root = join(sandbox, "project");
  outside = join(sandbox, "outside");
  mkdirSync(root);
  mkdirSync(outside);
  writeFileSync(join(outside, "secret.md"), `# Secret\nprimary ${SECRET} #123456\n`);
  writeFileSync(join(outside, "secret.json"), JSON.stringify({ secret: SECRET }));
  writeFileSync(join(outside, "secret.glb"), tinyGlb());
  writeFileSync(
    join(root, "DESIGN.md"),
    "# Brand\n- Primary color: #ff5500\n- Background: #101010\n- Heading font: Space Grotesk\n",
  );
  writeFileSync(join(root, "tiny.glb"), tinyGlb());
  symlinkSync(outside, join(root, "link-dir"));
  symlinkSync(join(outside, "secret.md"), join(root, "link.md"));
  symlinkSync(join(outside, "secret.glb"), join(root, "link.glb"));

  site = createServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(
      '<!doctype html><html lang="en"><head><title>E2E static site</title><meta name="description" content="Static page for the MCP e2e test."></head><body><h1>Hi</h1></body></html>',
    );
  });
  await new Promise<void>((done) => site.listen(0, "127.0.0.1", done));
  siteUrl = `http://127.0.0.1:${(site.address() as AddressInfo).port}/`;

  const passthrough = Object.fromEntries(
    ["PLAYWRIGHT_BROWSERS_PATH", "HOME", "USERPROFILE", "LOCALAPPDATA"].flatMap((k) => {
      const v = process.env[k];
      return v === undefined ? [] : [[k, v]];
    }),
  );
  client = new Client({ name: "e2e", version: "0.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [SERVER],
      env: { ...getDefaultEnvironment(), ...passthrough, BEVL_PROJECT_ROOT: root },
      stderr: "pipe",
    }),
  );
});

afterAll(async () => {
  await client?.close();
  await new Promise<void>((done) => (site ? site.close(() => done()) : done()));
  rmSync(sandbox, { recursive: true, force: true });
});

describe("tool list", () => {
  it("lists the shipped tools with honest descriptions", async () => {
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((t) => [t.name, t]));
    for (const name of ["check_site", "optimize_assets", "read_brand_tokens"]) {
      expect(byName.has(name), `${name} is listed`).toBe(true);
    }
    for (const tool of tools) {
      expect(tool.description?.length ?? 0, `${tool.name} description`).toBeGreaterThan(30);
    }
    expect(byName.get("read_brand_tokens")?.description).toMatch(/read-only/i);
    expect(byName.get("optimize_assets")?.description).toMatch(/\.glb/);
    expect(byName.get("optimize_assets")?.description).toMatch(/never writes outside/i);
    expect(byName.get("check_site")?.description).toMatch(/localhost/i);
    expect(byName.get("check_site")?.description).toMatch(/\.bevl\/reports/);
  });

  it("bounds every input: strings have limits or enums, numbers have ranges", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      const schema = tool.inputSchema as {
        type: string;
        properties?: Record<string, Record<string, unknown>>;
        additionalProperties?: unknown;
      };
      expect(schema.type).toBe("object");
      expect(schema.additionalProperties, `${tool.name} rejects extra keys`).not.toBe(true);
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        const where = `${tool.name}.${key}`;
        if (prop.type === "string") {
          const bounded =
            prop.maxLength !== undefined || prop.enum !== undefined || prop.const !== undefined;
          if (prop.pattern !== undefined)
            expect(prop.maxLength ?? PATTERN_ONLY.get(where)).toBeDefined();
          else expect(bounded, `${where} is bounded`).toBe(true);
        } else if (prop.type === "number" || prop.type === "integer") {
          expect(prop.minimum, `${where} minimum`).toBeDefined();
          expect(prop.maximum, `${where} maximum`).toBeDefined();
        }
      }
    }
    const check = tools.find((t) => t.name === "check_site")?.inputSchema.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(check.viewport?.enum).toEqual(["desktop", "phone"]);
    expect(check.ruleId?.pattern).toBeDefined();
  });
});

describe("safe input", () => {
  it("read_brand_tokens parses a DESIGN.md and changes nothing", async () => {
    const before = snapshot(root);
    const res = await call("read_brand_tokens", { filePath: "DESIGN.md" });
    expect(res.isError).toBe(false);
    const tokens = JSON.parse(res.text) as { colors: { primary: string; background: string } };
    expect(tokens.colors.primary).toBe("#ff5500");
    expect(tokens.colors.background).toBe("#101010");
    expect(snapshot(root)).toEqual(before);
  });

  it("optimize_assets writes the optimized .glb next to the input", async () => {
    const res = await call("optimize_assets", { input: "tiny.glb" });
    expect(res.isError, res.text).toBe(false);
    expect(res.text).toMatch(/Optimized/);
    expect(existsSync(join(root, "tiny-optimized.glb"))).toBe(true);
    const out = readFileSync(join(root, "tiny-optimized.glb"));
    expect(out.subarray(0, 4).toString("ascii")).toBe("glTF");
  });

  it("optimize_assets reports an optimizer failure as a clean error", async () => {
    const res = await call("optimize_assets", { input: "tiny.glb" });
    if (res.isError) expect(res.text).not.toMatch(/\n\s+at /);
  });

  it("check_site checks a local server and writes its report inside the root", async () => {
    const res = await call("check_site", {
      url: siteUrl,
      ruleId: "seo/title",
      viewport: "desktop",
    });
    expect(res.isError, res.text).toBe(false);
    expect(res.text).toMatch(/Score: \d+\/100/);
    const reports = join(root, ".bevl", "reports");
    expect(existsSync(reports)).toBe(true);
    expect(readdirSync(reports).length).toBeGreaterThan(0);
  });
});

describe("hostile input", () => {
  it("refuses paths that leave the root, directly or through symlinks", async () => {
    const before = snapshot(outside);
    const cases: [string, Record<string, unknown>][] = [
      ["read_brand_tokens", { filePath: "../outside/secret.md" }],
      ["read_brand_tokens", { filePath: join(outside, "secret.json") }],
      ["read_brand_tokens", { filePath: "link.md" }],
      ["read_brand_tokens", { filePath: "link-dir/secret.json" }],
      ["read_brand_tokens", { filePath: "/etc/passwd" }],
      ["read_brand_tokens", { filePath: "DESIGN.md\0../../outside/secret.md" }],
      ["optimize_assets", { input: "../outside/secret.glb" }],
      ["optimize_assets", { input: "link.glb" }],
      ["optimize_assets", { input: "link-dir/secret.glb" }],
      ["optimize_assets", { input: "tiny.glb", output: "../outside/written.glb" }],
      ["optimize_assets", { input: "tiny.glb", output: "link-dir/written.glb" }],
      ["optimize_assets", { input: "tiny.glb", output: join(outside, "abs.glb") }],
      ["check_site", { url: siteUrl, projectDir: "../outside" }],
      ["check_site", { url: siteUrl, projectDir: "link-dir" }],
    ];
    for (const [name, args] of cases) {
      const res = await call(name, args);
      expect(res.isError, `${name} ${JSON.stringify(args)} should fail`).toBe(true);
      expect(res.text).not.toContain(SECRET);
    }
    expect(snapshot(outside)).toEqual(before);
    expect(existsSync(join(outside, "written.glb"))).toBe(false);
    expect(existsSync(join(outside, ".bevl"))).toBe(false);
  });

  it("refuses wrong file types", async () => {
    expect((await call("read_brand_tokens", { filePath: "tiny.glb" })).isError).toBe(true);
    expect((await call("optimize_assets", { input: "DESIGN.md" })).isError).toBe(true);
    expect((await call("optimize_assets", { input: "tiny.glb", output: "x.md" })).isError).toBe(
      true,
    );
    expect(existsSync(join(root, "x.md"))).toBe(false);
  });

  it("refuses file:, metadata, remote and malformed URLs", async () => {
    const urls = [
      "file:///etc/passwd",
      `file://${join(outside, "secret.md")}`,
      "http://169.254.169.254/latest/meta-data/",
      "http://169.254.169.254.nip.io/",
      "http://[fe80::1]/",
      "http://metadata.google.internal/",
      "https://example.com/",
      "http://user:pass@localhost:1/",
      "javascript:alert(1)",
      "ftp://localhost/",
      "not a url",
    ];
    for (const url of urls) {
      const res = await call("check_site", { url });
      expect(res.isError, `${url} should fail`).toBe(true);
    }
    expect(existsSync(join(root, ".bevl", "reports", "..", "..", "etc"))).toBe(false);
  });

  it("rejects ruleId injection and out-of-range arguments", async () => {
    const bad: Record<string, unknown>[] = [
      { url: siteUrl, ruleId: "../../etc/passwd" },
      { url: siteUrl, ruleId: "scroll/no-jumps; rm -rf /" },
      { url: siteUrl, ruleId: "scroll/../x" },
      { url: siteUrl, ruleId: "SCROLL/NO-JUMPS" },
      { url: siteUrl, viewport: "tv" },
      { url: siteUrl, seed: -1 },
      { url: siteUrl, seed: 1.5 },
      { url: `http://localhost/${"a".repeat(3000)}` },
      { url: siteUrl, projectDir: "a".repeat(2000) },
    ];
    for (const args of bad) {
      const res = await call("check_site", args);
      expect(res.isError, JSON.stringify(args).slice(0, 80)).toBe(true);
    }
    expect((await call("optimize_assets", { input: "tiny.glb", textureSize: 99999 })).isError).toBe(
      true,
    );
    expect((await call("optimize_assets", { input: "tiny.glb", textureSize: 8 })).isError).toBe(
      true,
    );
    expect((await call("read_brand_tokens", { filePath: "a".repeat(2000) })).isError).toBe(true);
  });

  it("answers an unknown tool with an error and keeps serving", async () => {
    expect((await call("delete_everything", {})).isError).toBe(true);
    expect((await call("read_brand_tokens", { filePath: "DESIGN.md" })).isError).toBe(false);
  });
});
