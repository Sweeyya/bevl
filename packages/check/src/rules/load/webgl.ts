// Rule: load/webgl
// Pass: WebGL2 works. Software renderer is info severity.
import type { Rule } from "../../rule.js";

const rule: Rule = {
  id: "load/webgl",
  group: "load",
  severity: "error",
  description: "WebGL2 must be available.",
  async run(ctx) {
    const result = await ctx.page
      .evaluate(() => {
        const canvas = document.createElement("canvas");
        const gl2 = canvas.getContext("webgl2");
        if (!gl2) return { supported: false, renderer: null };
        const ext = gl2.getExtension("WEBGL_debug_renderer_info");
        const renderer = ext ? (gl2.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : null;
        return { supported: true, renderer };
      })
      .catch(() => ({ supported: false, renderer: null }));

    if (!result.supported) {
      return [
        {
          rule: "load/webgl",
          severity: "error",
          viewport: ctx.viewport.name,
          message: `WebGL2 is not available on ${ctx.viewport.name}.`,
          fix: "Ensure the browser supports WebGL2. Add a static HTML fallback for browsers without WebGL.",
        },
      ];
    }

    const renderer = result.renderer ?? "";
    const isSoftware =
      renderer.toLowerCase().includes("swiftshader") ||
      renderer.toLowerCase().includes("llvmpipe") ||
      renderer.toLowerCase().includes("software");

    if (isSoftware) {
      return [
        {
          rule: "load/webgl",
          severity: "info",
          viewport: ctx.viewport.name,
          message: `WebGL2 is running on a software renderer (${renderer}) on ${ctx.viewport.name}.`,
          fix: "This is expected in CI. On real devices a GPU renderer will be used.",
        },
      ];
    }

    return [];
  },
};

export default rule;
