import { ChevronRight } from "lucide-react";
import { formatLabel } from "../lib/format";
import { useBranchData } from "../hooks/useBranchData";
import { useMapNavigation } from "../hooks/useMapNavigation";
import type { NavLevel } from "../types";

export function Breadcrumbs() {
  const { nav, goToLevel } = useMapNavigation();
  const { zones, regions } = useBranchData();
  const zone = zones.find((item) => item.zone_id === nav.zoneId);
  const region = regions.find((item) => item.region_id === nav.regionId);

  const crumbs: { label: string; level: NavLevel }[] = [{ label: "India", level: "india" }];
  if (zone) crumbs.push({ label: `${formatLabel(zone.zone_name)} Zone`, level: "zone" });
  if (region && nav.level !== "zone") crumbs.push({ label: `${formatLabel(region.region_name)} Region`, level: "region" });
  if (nav.district && (nav.level === "district" || nav.level === "branch")) {
    crumbs.push({ label: `${formatLabel(nav.district)} District`, level: "district" });
  }
  if (nav.level === "branch" && nav.branchCode) {
    crumbs.push({ label: nav.branchCode, level: "branch" });
  }

  return (
    <nav aria-label="Hierarchy" className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
      {crumbs.map((crumb, index) => {
        const current = index === crumbs.length - 1;
        return (
          <span key={`${crumb.level}-${crumb.label}`} className="flex items-center gap-1 whitespace-nowrap">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
            {current ? (
              <span className="font-semibold text-ink" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <button
                type="button"
                className="rounded-md px-1 py-0.5 text-navy-700 hover:bg-slate-100"
                onClick={() => goToLevel(crumb.level)}
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
