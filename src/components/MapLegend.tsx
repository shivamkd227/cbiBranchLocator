import { formatLabel } from "../lib/format";
import { useBranchData } from "../hooks/useBranchData";
import { useMapNavigation } from "../hooks/useMapNavigation";

export function MapLegend() {
  const { zones, zoneColors } = useBranchData();
  const { openZone, nav } = useMapNavigation();

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-[400] hidden max-h-[46%] w-[168px] overflow-auto rounded-2xl border border-line bg-white/95 p-3 shadow-card md:block">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">CBI Zones</p>
      <ul className="space-y-1">
        {zones.map((zone) => {
          const selected = nav.zoneId === zone.zone_id;
          return (
            <li key={zone.zone_id}>
              <button
                type="button"
                onClick={() => openZone(zone.zone_id)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs ${selected ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zoneColors[zone.zone_id] }} aria-hidden="true" />
                <span className="truncate text-ink">{formatLabel(zone.zone_name)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
