import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import branchesData from "../data/branches.json";
import { buildFeatureNetwork, type FeatureNetwork } from "../lib/geoJoin";
import { deriveSummaries } from "../lib/summaries";
import { buildZoneColorMap } from "../lib/zoneColors";
import type { Branch, DistrictSummary, RegionSummary, ZoneSummary } from "../types";

const STORAGE_KEY = "cbi-branch-master";

interface BranchDataValue {
  branches: Branch[];
  zones: ZoneSummary[];
  regions: RegionSummary[];
  districts: DistrictSummary[];
  zoneColors: Record<string, string>;
  network: Map<string, FeatureNetwork>;
  totals: {
    branches: number;
    zones: number;
    regions: number;
    states: number;
    districts: number;
  };
  byCode: Map<string, Branch>;
  byZone: Map<string, Branch[]>;
  byRegion: Map<string, Branch[]>;
  byDistrict: Map<string, Branch[]>;
  byPincode: Map<string, Branch[]>;
  replaceBranches: (branches: Branch[]) => void;
}

const BranchDataContext = createContext<BranchDataValue | null>(null);

function indexBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function readStoredBranches(): Branch[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Branch[];
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0]?.branch_code) return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildValue(branches: Branch[], replaceBranches: (next: Branch[]) => void): BranchDataValue {
  const { zones, regions, districts } = deriveSummaries(branches);
  const states = new Set(branches.map((branch) => branch.state.trim().toUpperCase()));
  const districtKeys = new Set(branches.map((branch) => `${branch.state.trim().toUpperCase()}|${branch.district.trim().toUpperCase()}`));
  return {
    branches,
    zones,
    regions,
    districts,
    zoneColors: buildZoneColorMap(zones.map((zone) => zone.zone_id)),
    network: buildFeatureNetwork(branches),
    totals: {
      branches: branches.length,
      zones: zones.length,
      regions: regions.length,
      states: states.size,
      districts: districtKeys.size,
    },
    byCode: new Map(branches.map((branch) => [branch.branch_code, branch])),
    byZone: indexBy(branches, (branch) => branch.zone_id),
    byRegion: indexBy(branches, (branch) => branch.region_id),
    byDistrict: indexBy(branches, (branch) => `${branch.region_id}|${branch.state}|${branch.district}`),
    byPincode: indexBy(branches, (branch) => branch.pincode),
    replaceBranches,
  };
}

export function BranchDataProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>(() => readStoredBranches() ?? (branchesData as Branch[]));
  const replaceBranches = useCallback((next: Branch[]) => {
    setBranches(next);
  }, []);
  const value = useMemo(() => buildValue(branches, replaceBranches), [branches, replaceBranches]);
  return createElement(BranchDataContext.Provider, { value }, children);
}

export function useBranchData(): BranchDataValue {
  const value = useContext(BranchDataContext);
  if (!value) throw new Error("useBranchData must be used within BranchDataProvider");
  return value;
}
