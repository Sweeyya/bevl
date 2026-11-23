import type { SnapMode } from "@bevl/core";
import { buildFixture, list, number, PROBE_TRACK, sectionList } from "../../host/src/e2e.js";

const params = new URLSearchParams(location.search);
const sections = sectionList(5);
const noSnapBeat = number("nosnap");
const mode = (params.get("mode") ?? "directional") as SnapMode;
const delay = number("delay");
const duration = number("duration");

export const fixture = buildFixture(sections, (base) => ({
  ...base,
  beats: base.beats.map((b, i) => (i === noSnapBeat ? { ...b, snap: false } : b)),
  tracks: [...(base.tracks ?? []), PROBE_TRACK],
  reducedMotion: { tracks: [PROBE_TRACK] },
  snap: {
    mode,
    ...(delay === undefined ? {} : { delay }),
    ...(duration === undefined ? {} : { duration }),
  },
  input: {
    fine: list("fine") ?? ["wheel"],
    coarse: list("coarse") ?? ["touch"],
    smoothing: number("smoothing") ?? 6,
  },
}));
