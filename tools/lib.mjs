import { execFile, spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function listExamples() {
  const dir = join(root, "examples");
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "package.json")))
    .map((e) => ({ name: e.name, dir: join(dir, e.name) }));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForUrl(url, child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`vite preview exited with ${child.exitCode}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`vite preview did not answer at ${url}`);
}

/** Builds an example for production and serves it with `vite preview`. */
export async function buildAndServe(example) {
  await run("pnpm", ["exec", "vite", "build", "--logLevel", "warn"], { cwd: example.dir });
  const port = await freePort();
  const child = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: example.dir, stdio: "ignore" },
  );
  const url = `http://127.0.0.1:${port}/`;
  try {
    await waitForUrl(url, child);
  } catch (err) {
    child.kill();
    throw err;
  }
  return { url, stop: () => child.kill() };
}
