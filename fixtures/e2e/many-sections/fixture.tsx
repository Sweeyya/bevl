import { buildFixture, sectionList } from "../../host/src/e2e.js";

export const fixture = buildFixture(sectionList(12), (base) => base);
