import type { Rule } from "../rule.js";
import drawCalls from "./budgets/draw-calls.js";
import triangles from "./budgets/triangles.js";
import consoleErrors from "./load/console-errors.js";
import ready from "./load/ready.js";
import webgl from "./load/webgl.js";
import noNan from "./render/no-nan.js";
import notBlank from "./render/not-blank.js";

const rules: Rule[] = [ready, consoleErrors, webgl, notBlank, noNan, triangles, drawCalls];

export default rules;
