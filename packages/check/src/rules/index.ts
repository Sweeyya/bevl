import type { Rule } from "../rule.js";
import keyboard from "./a11y/keyboard.js";
import drawCalls from "./budgets/draw-calls.js";
import triangles from "./budgets/triangles.js";
import sectionText from "./html/section-text.js";
import consoleErrors from "./load/console-errors.js";
import ready from "./load/ready.js";
import webgl from "./load/webgl.js";
import noNan from "./render/no-nan.js";
import notBlank from "./render/not-blank.js";
import noJumps from "./scroll/no-jumps.js";
import noRoll from "./scroll/no-roll.js";
import reachesEverySection from "./scroll/reaches-every-section.js";
import metaDescription from "./seo/meta-description.js";
import title from "./seo/title.js";

const rules: Rule[] = [
  ready,
  consoleErrors,
  webgl,
  notBlank,
  noNan,
  triangles,
  drawCalls,
  reachesEverySection,
  noJumps,
  noRoll,
  sectionText,
  title,
  metaDescription,
  keyboard,
];

export default rules;
