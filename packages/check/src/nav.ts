import type { Page } from "playwright";

export const NAV_CONTROLS = "nav a, nav button";

export interface NavControl {
  index: number;
  tag: string;
  href: string | null;
  text: string;
  visible: boolean;
  sectionId: string | null;
}

export function listNavControls(page: Page): Promise<NavControl[]> {
  return page.evaluate((selector) => {
    const bridge = (
      window as unknown as { __bevl?: { sections(): Array<{ id: string; domId: string }> } }
    ).__bevl;
    const sections = bridge?.sections() ?? [];
    return [...document.querySelectorAll<HTMLElement>(selector)].map((el, index) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const href = el.getAttribute("href");
      const hash = href?.startsWith("#") ? href.slice(1) : null;
      const text = (el.textContent ?? "").trim().toLowerCase();
      const byText =
        sections.find((s) => hash !== null && (s.domId === hash || s.id === hash)) ??
        sections.find((s) => text !== "" && s.id.toLowerCase() === text);
      return {
        index,
        tag: el.tagName.toLowerCase(),
        href,
        text,
        visible:
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none",
        sectionId: byText?.id ?? null,
      };
    });
  }, NAV_CONTROLS);
}
