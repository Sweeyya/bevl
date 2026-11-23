import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertSafeUrl, requireExtension, resolveInside } from "../guard.js";
import {
  addSectionTool,
  applyBrandTool,
  checkSite,
  createSiteTool,
  optimizeAssets,
  readBrandTokens,
} from "../tools.js";

let base = "";
let root = "";
let outside = "";

beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), "bevl-guard-")));
  root = join(base, "project");
  outside = join(base, "outside");
  mkdirSync(root);
  mkdirSync(outside);
  writeFileSync(join(outside, "secret.json"), '{"secret":true}');
  writeFileSync(join(root, "DESIGN.md"), "# Brand\n- primary: #112233\n");
  symlinkSync(outside, join(root, "link"));
});

afterAll(() => rmSync(base, { recursive: true, force: true }));

describe("resolveInside", () => {
  it("allows files inside the root, including ones that do not exist yet", () => {
    expect(resolveInside(root, "DESIGN.md")).toBe(join(root, "DESIGN.md"));
    expect(resolveInside(root, "new/out.glb")).toBe(join(root, "new/out.glb"));
    expect(resolveInside(root, ".")).toBe(root);
  });
  it("rejects parent traversal and absolute paths outside", () => {
    expect(() => resolveInside(root, "../outside/secret.json")).toThrow(/outside the project root/);
    expect(() => resolveInside(root, join(outside, "secret.json"))).toThrow(/Fix:/);
    expect(() => resolveInside(root, "/etc/passwd")).toThrow();
  });
  it("rejects symlinks that escape the root", () => {
    expect(() => resolveInside(root, "link/secret.json")).toThrow(/outside the project root/);
    expect(() => resolveInside(root, "link/new.glb")).toThrow(/outside the project root/);
  });
});

describe("requireExtension", () => {
  it("checks the extension case-insensitively", () => {
    expect(requireExtension("a.GLB", [".glb"], "input")).toBe("a.GLB");
    expect(() => requireExtension("a.png", [".glb"], "input")).toThrow(/Fix:/);
  });
});

describe("assertSafeUrl", () => {
  it("allows local dev servers", () => {
    for (const u of [
      "http://localhost:3000",
      "http://127.0.0.1:5173/x?y=1",
      "http://[::1]:8080",
      "http://app.localhost:3000",
    ]) {
      expect(assertSafeUrl(u, {}).href).toContain(new URL(u).host);
    }
  });
  it("blocks non-http schemes", () => {
    for (const u of ["file:///etc/passwd", "javascript:alert(1)", "data:text/html,hi", "ftp://x"]) {
      expect(() => assertSafeUrl(u, {})).toThrow();
    }
  });
  it("blocks remote and private hosts by default", () => {
    for (const u of [
      "https://example.com",
      "http://10.0.0.5",
      "http://192.168.1.1",
      "http://0.0.0.0",
    ]) {
      expect(() => assertSafeUrl(u, {})).toThrow(/not local/);
    }
  });
  it("always blocks cloud metadata, even with the remote opt-in", () => {
    const env = { BEVL_ALLOW_REMOTE: "1" };
    for (const u of [
      "http://169.254.169.254/latest/meta-data/",
      "http://metadata.google.internal/",
    ]) {
      expect(() => assertSafeUrl(u, env)).toThrow(/blocked/);
    }
    expect(assertSafeUrl("https://example.com", env).hostname).toBe("example.com");
  });
  it("blocks credentials in URLs and garbage input", () => {
    expect(() => assertSafeUrl("http://user:pw@localhost:3000", {})).toThrow(/credentials/);
    expect(() => assertSafeUrl("not a url", {})).toThrow(/valid URL/);
  });
});

describe("tool handlers refuse unsafe input before doing any work", () => {
  const env = () => ({ BEVL_PROJECT_ROOT: root });
  it("check_site rejects bad URLs and project dirs outside the root", async () => {
    await expect(checkSite({ url: "file:///etc/passwd" }, env())).rejects.toThrow(/scheme/);
    await expect(checkSite({ url: "http://169.254.169.254/" }, env())).rejects.toThrow(/blocked/);
    await expect(
      checkSite({ url: "http://localhost:1", projectDir: "../outside" }, env()),
    ).rejects.toThrow(/outside the project root/);
  });
  it("optimize_assets rejects reads, writes and file types it should not touch", async () => {
    await expect(optimizeAssets({ input: "../outside/secret.json" }, env())).rejects.toThrow();
    await expect(
      optimizeAssets({ input: "model.glb", output: "../outside/x.glb" }, env()),
    ).rejects.toThrow(/outside the project root/);
    await expect(optimizeAssets({ input: "DESIGN.md" }, env())).rejects.toThrow(/\.glb/);
    await expect(
      optimizeAssets({ input: "model.glb", output: "overwrite.json" }, env()),
    ).rejects.toThrow(/\.glb/);
  });
  it("read_brand_tokens reads project files only", async () => {
    expect(JSON.parse(await readBrandTokens("DESIGN.md", env()))).toBeTypeOf("object");
    await expect(readBrandTokens("../outside/secret.json", env())).rejects.toThrow(/outside/);
    await expect(readBrandTokens("link/secret.json", env())).rejects.toThrow(/outside/);
    await expect(readBrandTokens("/etc/passwd", env())).rejects.toThrow();
  });
  it("create_site stays under the root and rejects bad names", async () => {
    await expect(createSiteTool({ name: "ok", dir: "../outside" }, env())).rejects.toThrow(
      /outside/,
    );
    await expect(createSiteTool({ name: "ok", dir: "link" }, env())).rejects.toThrow(/outside/);
    for (const name of ["../x", "<script>", 'a"b', "/etc"]) {
      await expect(createSiteTool({ name }, env())).rejects.toThrow(/Invalid site name/);
    }
    await createSiteTool({ name: "made", dir: "sites" }, env());
    expect(existsSync(join(root, "sites", "made", "bevl.json"))).toBe(true);
    await expect(createSiteTool({ name: "made", dir: "sites" }, env())).rejects.toThrow(
      /already exists/,
    );
  });
  it("add_section and apply_brand reject traversal, symlinks, bad ids and titles", async () => {
    await createSiteTool({ name: "p" }, env());
    for (const projectDir of ["../outside", "link", "/etc"]) {
      await expect(addSectionTool({ id: "x", title: "T", projectDir }, env())).rejects.toThrow();
      await expect(applyBrandTool({ file: "DESIGN.md", projectDir }, env())).rejects.toThrow();
    }
    for (const id of ["../x", "<script>", 'a"b', "'; drop"]) {
      await expect(addSectionTool({ id, title: "T", projectDir: "p" }, env())).rejects.toThrow(
        /Invalid section id/,
      );
    }
    await expect(
      addSectionTool({ id: "x", title: "a\nb", projectDir: "p" }, env()),
    ).rejects.toThrow(/title/);
    await expect(
      applyBrandTool({ file: "../outside/secret.json", projectDir: "p" }, env()),
    ).rejects.toThrow(/outside/);
    await expect(
      applyBrandTool({ file: "link/secret.json", projectDir: "p" }, env()),
    ).rejects.toThrow(/outside/);
    await expect(
      applyBrandTool({ file: "p/bevl.json", projectDir: "p" }, env()),
    ).resolves.toContain("brand.tokens.json");
    await expect(applyBrandTool({ file: "DESIGN.md", projectDir: "p" }, env())).rejects.toThrow(
      /outside the project root/,
    );
    expect(await addSectionTool({ id: "extra", title: "Extra", projectDir: "p" }, env())).toContain(
      "Inserted",
    );
  });
});
