import { buildFixture, list, number, PROBE_TRACK, sectionList } from "../../host/src/e2e.js";

export const fixture = buildFixture(sectionList(3), (base) => {
  const fine = list("fine");
  const coarse = list("coarse");
  const smoothing = number("smoothing");
  return {
    ...base,
    tracks: [...(base.tracks ?? []), PROBE_TRACK],
    snap: { mode: "none" },
    input: {
      ...(fine ? { fine } : {}),
      ...(coarse ? { coarse } : {}),
      ...(smoothing === undefined ? {} : { smoothing }),
    },
  };
});
