/** Distinct dark hues. Extra slots keep a future zone from shifting the existing colors. */
export const ZONE_PALETTE = [
  "#143a66",
  "#0b6b45",
  "#b45309",
  "#6d28d9",
  "#be123c",
  "#0f5f73",
  "#3f6212",
  "#a16207",
  "#1d4ed8",
  "#9a3412",
  "#86198f",
  "#0e7490",
  "#7c2d12",
  "#1e3a8a",
  "#4d7c0f",
  "#334155",
];

export function buildZoneColorMap(zoneIdsInOrder: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  zoneIdsInOrder.forEach((zoneId, index) => {
    map[zoneId] = ZONE_PALETTE[index % ZONE_PALETTE.length];
  });
  return map;
}
