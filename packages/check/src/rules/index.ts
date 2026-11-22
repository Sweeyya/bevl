import type { Rule } from "../rule.js";
import keyboard from "./a11y/keyboard.js";
import keyboardReachesBeats from "./a11y/keyboard-reaches-beats.js";
import drawCalls from "./budgets/draw-calls.js";
import textureMb from "./budgets/texture-mb.js";
import triangles from "./budgets/triangles.js";
import noCanvasCopy from "./html/no-canvas-copy.js";
import sectionText from "./html/section-text.js";
import consoleErrors from "./load/console-errors.js";
import failedRequests from "./load/failed-requests.js";
import ready from "./load/ready.js";
import webgl from "./load/webgl.js";
import buttonsWork from "./nav/buttons-work.js";
import linkGlides from "./nav/link-glides.js";
import menuExists from "./nav/menu-exists.js";
import fallback from "./render/fallback.js";
import noNan from "./render/no-nan.js";
import notBlank from "./render/not-blank.js";
import deterministic from "./scroll/deterministic.js";
import motionAllowances from "./scroll/motion-allowances.js";
import noFreeRoam from "./scroll/no-free-roam.js";
import noJumps from "./scroll/no-jumps.js";
import noRoll from "./scroll/no-roll.js";
import noSpin from "./scroll/no-spin.js";
import reachesEverySection from "./scroll/reaches-every-section.js";
import snapNoTrap from "./scroll/snap-no-trap.js";
import snapSettles from "./scroll/snap-settles.js";
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
  snapSettles,
  snapNoTrap,
  deterministic,
  motionAllowances,
  sectionText,
  title,
  metaDescription,
  keyboard,
  keyboardReachesBeats,
  noSpin,
  noFreeRoam,
  menuExists,
  linkGlides,
  buttonsWork,
  noCanvasCopy,
  fallback,
  textureMb,
  failedRequests,
];

export default rules;
