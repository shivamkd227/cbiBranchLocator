import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Branch, NavigationState } from "../types";

interface NavigationValue {
  nav: NavigationState;
  reset: () => void;
  openZone: (zoneId: string) => void;
  openRegion: (zoneId: string, regionId: string) => void;
  openDistrict: (zoneId: string, regionId: string, state: string, district: string) => void;
  openBranch: (branch: Branch) => void;
  goToLevel: (level: NavigationState["level"]) => void;
}

const INDIA: NavigationState = {
  level: "india",
  zoneId: null,
  regionId: null,
  state: null,
  district: null,
  branchCode: null,
};

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [nav, setNav] = useState<NavigationState>(INDIA);

  const reset = useCallback(() => setNav(INDIA), []);
  const openZone = useCallback((zoneId: string) => {
    setNav({ level: "zone", zoneId, regionId: null, state: null, district: null, branchCode: null });
  }, []);
  const openRegion = useCallback((zoneId: string, regionId: string) => {
    setNav({ level: "region", zoneId, regionId, state: null, district: null, branchCode: null });
  }, []);
  const openDistrict = useCallback((zoneId: string, regionId: string, state: string, district: string) => {
    setNav({ level: "district", zoneId, regionId, state, district, branchCode: null });
  }, []);
  const openBranch = useCallback((branch: Branch) => {
    setNav({
      level: "branch",
      zoneId: branch.zone_id,
      regionId: branch.region_id,
      state: branch.state,
      district: branch.district,
      branchCode: branch.branch_code,
    });
  }, []);
  const goToLevel = useCallback((level: NavigationState["level"]) => {
    setNav((current) => {
      if (level === "india") return INDIA;
      if (level === "zone" && current.zoneId) {
        return { ...INDIA, level: "zone", zoneId: current.zoneId };
      }
      if (level === "region" && current.zoneId && current.regionId) {
        return { ...INDIA, level: "region", zoneId: current.zoneId, regionId: current.regionId };
      }
      if (level === "district" && current.zoneId && current.regionId && current.state && current.district) {
        return {
          ...current,
          level: "district",
          branchCode: null,
        };
      }
      return current;
    });
  }, []);

  const value = useMemo(
    () => ({
      nav,
      reset,
      openZone,
      openRegion,
      openDistrict,
      openBranch,
      goToLevel,
    }),
    [nav, reset, openZone, openRegion, openDistrict, openBranch, goToLevel],
  );

  return createElement(NavigationContext.Provider, { value }, children);
}

export function useMapNavigation(): NavigationValue {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("useMapNavigation must be used within NavigationProvider");
  return value;
}
