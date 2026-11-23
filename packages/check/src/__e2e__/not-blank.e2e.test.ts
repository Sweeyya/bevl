import type { Page } from "playwright";
import { afterAll, describe, expect, it } from "vitest";
import notBlank from "../rules/render/not-blank.js";
import { closeBrowser, DESKTOP, launch } from "./harness.js";

afterAll(closeBrowser);

const BRIDGE = "<script>window.__toros={ready:Promise.resolve(),step:()=>({})}</script>";
const NAV = (height: number) =>
  `<nav style="position:fixed;top:0;left:0;right:0;height:${height}px;background:#fc0">menu</nav>`;
const CANVAS =
  '<canvas id="c" width="1280" height="720" style="position:fixed;inset:0;width:100%;height:100%"></canvas>';
const PAINT =
  "<script>const g=c.getContext('2d');g.fillStyle='#103';g.fillRect(0,0,1280,720);" +
  "g.fillStyle='#e63946';g.fillRect(300,200,400,300);g.fillStyle='#2a9d8f';g.fillRect(800,100,200,200)</script>";
const FLAT =
  "<script>const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,1280,720)</script>";

async function findings(body: string): Promise<number> {
  const context = await (await launch()).newContext(DESKTOP);
  const page: Page = await context.newPage();
  await page.setContent(`<body style="margin:0">${BRIDGE}${body}</body>`);
  const found = await notBlank.run({
    page,
    viewport: { name: "desktop", width: 1280, height: 720, isMobile: false },
    url: "about:blank",
    projectDir: ".",
  });
  await context.close();
  return found.length;
}

describe("render/not-blank measures the canvas alone", () => {
  it("fails a blank canvas under a very tall nav", async () => {
    expect(await findings(`${CANVAS}${FLAT}${NAV(400)}`)).toBe(1);
  });
  it("passes a canvas with content and no nav", async () => {
    expect(await findings(`${CANVAS}${PAINT}`)).toBe(0);
  });
  it("passes a canvas with content under a nav", async () => {
    expect(await findings(`${CANVAS}${PAINT}${NAV(80)}`)).toBe(0);
  });
});
