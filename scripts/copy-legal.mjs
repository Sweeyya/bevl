import { copyFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
for (const file of ["LICENSE", "NOTICE"]) copyFileSync(join(root, file), join(process.cwd(), file));
