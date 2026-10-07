import { useEffect, useRef, useState, type PointerEvent } from "react";
import { BranchDetails } from "./BranchDetails";
import { DistrictDetails } from "./DistrictDetails";
import { IndiaOverview } from "./IndiaOverview";
import { RegionDetails } from "./RegionDetails";
import { ZoneDetails } from "./ZoneDetails";
import { useMapNavigation } from "../hooks/useMapNavigation";

export function SidePanel() {
  const { nav } = useMapNavigation();
  const [mobile, setMobile] = useState(false);
  const [height, setHeight] = useState(280);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (mobile) setHeight(Math.round(window.innerHeight * 0.42));
  }, [mobile, nav.level]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!mobile) return;
    dragRef.current = { startY: event.clientY, startHeight: height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const next = dragRef.current.startHeight + (dragRef.current.startY - event.clientY);
    const max = window.innerHeight - 96;
    setHeight(Math.min(max, Math.max(120, next)));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <aside
      className="z-30 flex min-h-0 flex-col border-line bg-mist md:w-[40%] md:border-l xl:w-[30%] max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-3xl max-md:border max-md:shadow-float"
      style={mobile ? { height } : undefined}
      aria-label="Network details"
    >
      <button
        type="button"
        className="flex justify-center py-2 md:hidden"
        aria-label="Drag branch details"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="h-1.5 w-12 rounded-full bg-slate-300" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 md:pt-4">
        {nav.level === "india" && <IndiaOverview />}
        {nav.level === "zone" && nav.zoneId && <ZoneDetails zoneId={nav.zoneId} />}
        {nav.level === "region" && nav.regionId && <RegionDetails regionId={nav.regionId} />}
        {nav.level === "district" && nav.regionId && nav.state && nav.district && (
          <DistrictDetails regionId={nav.regionId} state={nav.state} district={nav.district} />
        )}
        {nav.level === "branch" && nav.branchCode && <BranchDetails branchCode={nav.branchCode} />}
        {nav.level !== "india" && !nav.zoneId && (
          <p className="text-sm text-slate-500">Data unavailable for this selection</p>
        )}
      </div>
    </aside>
  );
}
