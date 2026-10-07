import { ChevronRight } from "lucide-react";
import { formatCount, formatLabel } from "../lib/format";
import { getRegionsByZone } from "../lib/queries";
import { useBranchData } from "../hooks/useBranchData";
import { useMapNavigation } from "../hooks/useMapNavigation";

export function ZoneDetails({ zoneId }: { zoneId: string }) {
  const { zones, regions, zoneColors } = useBranchData();
  const { openRegion } = useMapNavigation();
  const zone = zones.find((item) => item.zone_id === zoneId);
  if (!zone) return <p className="text-sm text-slate-500">Data unavailable for this selection</p>;
  const zoneRegions = getRegionsByZone(regions, zoneId);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Zone</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: zoneColors[zone.zone_id] }} aria-hidden="true" />
          <h2 className="text-xl font-semibold text-ink">{formatLabel(zone.zone_name)} Zone</h2>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Regions" value={zone.region_count} />
        <Metric label="Districts" value={zone.district_count} />
        <Metric label="Branches" value={zone.branch_count} />
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Regions</h3>
        <ul className="space-y-2">
          {zoneRegions.map((region) => (
            <li key={region.region_id}>
              <button
                type="button"
                onClick={() => openRegion(zone.zone_id, region.region_id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3 py-3 text-left shadow-sm hover:border-navy-700/30"
              >
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {formatLabel(region.region_name)}
                    {region.ro_region === "Yes" && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        RO
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {formatCount(region.district_count)} districts · {formatCount(region.branch_count)} branches
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-2 py-2 text-center shadow-sm">
      <div className="text-base font-semibold text-ink">{formatCount(value)}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
