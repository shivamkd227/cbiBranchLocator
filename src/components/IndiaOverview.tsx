import { formatCount, formatLabel } from "../lib/format";
import { useBranchData } from "../hooks/useBranchData";
import { useMapNavigation } from "../hooks/useMapNavigation";

export function IndiaOverview() {
  const { zones, zoneColors } = useBranchData();
  const { openZone } = useMapNavigation();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">India</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">Branch network</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Districts are coloured by the Central Bank of India zone that serves them. Select a zone to see its regions.
        </p>
      </div>
      <ul className="space-y-2">
        {zones.map((zone) => (
          <li key={zone.zone_id}>
            <button
              type="button"
              onClick={() => openZone(zone.zone_id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-3 py-3 text-left shadow-sm hover:border-navy-700/30"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: zoneColors[zone.zone_id] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{formatLabel(zone.zone_name)}</span>
                <span className="block text-xs text-slate-500">
                  {formatCount(zone.region_count)} regions · {formatCount(zone.district_count)} districts ·{" "}
                  {formatCount(zone.branch_count)} branches
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
