import { Building2, Landmark, Map, MapPinned, Network } from "lucide-react";
import { formatCount } from "../lib/format";
import { useBranchData } from "../hooks/useBranchData";

const items = [
  { key: "branches", label: "Branches", icon: Building2 },
  { key: "zones", label: "Zones", icon: Network },
  { key: "regions", label: "Regions", icon: Landmark },
  { key: "states", label: "States", icon: Map },
  { key: "districts", label: "Districts", icon: MapPinned },
] as const;

export function StatsCards() {
  const { totals } = useBranchData();
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5" aria-label="Network totals">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="flex min-w-[104px] items-center gap-2 rounded-xl border border-line bg-white px-2.5 py-1.5 shadow-sm"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-navy-700" aria-hidden="true" />
            <div className="leading-tight">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="text-sm font-semibold text-ink">{formatCount(totals[item.key])}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
