import { afterAll, describe, expect, it } from "vitest";
import { closeBrowser, open, PHONE } from "./harness.js";

afterAll(closeBrowser);

describe("nav with many sections", () => {
  it("lets every link be reached and used on a phone", async () => {
    const { context, page } = await open("many-sections", {}, PHONE);
    const links = page.locator("nav a");
    const count = await links.count();
    expect(count).toBe(12);

    for (let i = 0; i < count; i++) {
      await links.nth(i).click({ timeout: 3000 });
      await page.evaluate(() => window.__toros?.step(2000));
      const progress = await page.evaluate(() => window.__toros?.scroll() ?? Number.NaN);
      expect(progress).toBeCloseTo(i / (count - 1), 2);
    }
    await context.close();
  });

  it("keeps the nav inside the screen so it scrolls instead of overflowing the page", async () => {
    const { context, page } = await open("many-sections", {}, PHONE);
    const { navWidth, viewport, scrolls } = await page.evaluate(() => {
      const ul = document.querySelector("nav ul") as HTMLElement;
      return {
        navWidth: ul.getBoundingClientRect().width,
        viewport: innerWidth,
        scrolls: ul.scrollWidth > ul.clientWidth,
      };
    });
    expect(navWidth).toBeLessThanOrEqual(viewport);
    expect(scrolls).toBe(true);
    await context.close();
  });
});
