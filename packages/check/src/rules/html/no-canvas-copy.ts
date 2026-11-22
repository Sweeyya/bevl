// Rule: html/no-canvas-copy
// Pass: no 3D text mesh holds more than 40 characters
import { waitReady } from "../../drive.js";
import type { Rule } from "../../rule.js";

const MAX_TEXT_MESH_CHARS = 40;

const rule: Rule = {
  id: "html/no-canvas-copy",
  group: "html",
  severity: "error",
  description: `No 3D text mesh may hold more than ${MAX_TEXT_MESH_CHARS} characters.`,
  async run(ctx) {
    if (!(await waitReady(ctx.page))) return [];
    const meshes = await ctx.page.evaluate(
      () =>
        (
          window as unknown as {
            __doodley?: { textMeshes(): Array<{ text: string; charCount: number }> };
          }
        ).__doodley?.textMeshes() ?? [],
    );
    const long = meshes.filter((m) => m.charCount > MAX_TEXT_MESH_CHARS);
    if (long.length === 0) return [];
    return [
      {
        rule: "html/no-canvas-copy",
        severity: "error",
        viewport: ctx.viewport.name,
        message: `${long.length} 3D text mesh(es) hold more than ${MAX_TEXT_MESH_CHARS} characters on ${ctx.viewport.name} (longest ${Math.max(...long.map((m) => m.charCount))}).`,
        fix: "Fix: move body copy into the HTML layer (real text in the section) and keep 3D text to short labels of 40 characters or fewer.",
        evidence: { data: { lengths: long.map((m) => m.charCount) } },
      },
    ];
  },
};

export default rule;
