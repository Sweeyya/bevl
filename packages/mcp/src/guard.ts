import { realpathSync } from "node:fs";
import { extname, resolve } from "node:path";
import { resolveInside as resolveWithin } from "@bevl/tokens";

export const ROOT_ENV = "BEVL_PROJECT_ROOT";
export const ALLOW_REMOTE_ENV = "BEVL_ALLOW_REMOTE";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function projectRoot(env: NodeJS.ProcessEnv = process.env): string {
  return realpathSync(resolve(env[ROOT_ENV] ?? process.cwd()));
}

export function resolveInside(root: string, p: string): string {
  return resolveWithin(
    root,
    p,
    `use a path inside the project, or set ${ROOT_ENV} to the folder you want to allow`,
  );
}

export function requireExtension(p: string, allowed: readonly string[], what: string): string {
  if (!allowed.includes(extname(p).toLowerCase())) {
    throw new Error(`${what} must end in ${allowed.join(" or ")}. Fix: pass a ${allowed[0]} file.`);
  }
  return p;
}

function isBlockedAddress(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (/^169\.254\./.test(h) || h === "metadata.google.internal") return true;
  if (/^fe80:/.test(h) || h === "fd00:ec2::254") return true;
  return false;
}

/** Only http(s) URLs. Remote hosts need an explicit opt-in, and cloud metadata addresses are never allowed. */
export function assertSafeUrl(raw: string, env: NodeJS.ProcessEnv = process.env): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `"${raw}" is not a valid URL. Fix: pass a full URL like http://localhost:3000.`,
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `URL scheme "${url.protocol}" is not allowed. Fix: use an http:// or https:// URL.`,
    );
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed. Fix: remove the user:password part.");
  }
  const host = url.hostname.toLowerCase();
  if (isBlockedAddress(host)) {
    throw new Error(`Host "${host}" is blocked (link-local and cloud metadata addresses).`);
  }
  const local = LOCAL_HOSTS.has(host) || host.endsWith(".localhost");
  if (!local && env[ALLOW_REMOTE_ENV] !== "1") {
    throw new Error(
      `Host "${host}" is not local. Fix: check a local dev server (http://localhost:PORT), or set ${ALLOW_REMOTE_ENV}=1 to allow remote sites.`,
    );
  }
  return url;
}
