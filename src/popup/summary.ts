import type { Measurement } from "../metrics/metrics";

const fmt = (v: number | null, unit = "") => (v === null ? "n/a" : `${v}${unit}`);

/** The few numbers shown in the popup. The full set is in the downloaded file. */
export function summarize(m: Measurement): [string, string][] {
  const x = m.metrics;
  return [
    ["Media per 1,000 px", fmt(x.mediaPer1000Px)],
    ["Text units per 1,000 px", fmt(x.textUnitsPer1000Px)],
    ["Main / peripheral blocks", `${x.mainBlocks} / ${x.peripheralBlocks}`],
    ["Headings per 1,000 text units", fmt(x.headingsPer1000Text)],
    [
      "White space (approx.)",
      x.whitespaceRatio === null ? "n/a" : `${Math.round(x.whitespaceRatio * 100)}%`,
    ],
    ["Mean saturation", fmt(x.meanSaturation)],
    [
      "Underlined links",
      x.underlinedLinkRatio === null ? "n/a" : `${Math.round(x.underlinedLinkRatio * 100)}%`,
    ],
    ["Autoplay / QR codes", `${x.autoplayCount} / ${x.qrCodeCount}`],
  ];
}
