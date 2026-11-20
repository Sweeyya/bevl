import type { Rule } from "../rule.js";
import consoleErrors from "./load/console-errors.js";
import ready from "./load/ready.js";
import notBlank from "./render/not-blank.js";

/** All rules included in this skeleton release. */
const rules: Rule[] = [ready, consoleErrors, notBlank];

export default rules;
