import { ChevronRight } from "lucide-react";
import { formatCount, formatLabel } from "../lib/format";
import { getDistrictsByRegion } from "../lib/queries";
import { useBranchData } from "../hooks/useBranchData";
import { useMapNavigation } from "../hooks/useMapNavigation";

export function RegionDetails({ regionId }: { regionId: string }) {
  const { regions, districts } = useBranchData();
  const { openDistrict } = useMapNavigation();
  const region = regions.find((item) => item.region_id === regionId);
  if (!region) return <p className="text-sm text-slate-500">Data unavailable for this selection</p>;
  const regionDistricts = getDistrictsByRegion(districts, regionId);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Region</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">{formatLabel(region.region_name)}</h2>
        {region.ro_region === "Yes" && (
          <p className="mt-1 text-xs text-slate-500">Kept separate from {formatLabel(region.base_region_name)} because the source marks it as an RO region.</p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <Info label="Zone" value={formatLabel(region.zone_name)} />
        <Info label="Branches" value={formatCount(region.branch_count)} />
        <Info label="Districts" value={formatCount(region.district_count)} />
        <Info label="Base region" value={formatLabel(region.base_region_name)} />
      </dl>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Districts</h3>
        <ul className="space-y-2">
          {regionDistricts.map((district) => (
            <li key={`${district.state}-${district.district}`}>
              <button
                type="button"
                onClick={() => openDistrict(region.zone_id, region.region_id, district.state, district.district)}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-3 py-3 text-left shadow-sm hover:border-navy-700/30"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">{formatLabel(district.district)}</span>
                  <span className="block text-xs text-slate-500">
                    {formatLabel(district.state)} · {formatCount(district.branch_count)} branches
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-3 py-2 shadow-sm">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
