import type { Branch, DistrictSummary, RegionSummary, SearchGroups, ZoneSummary } from "../types";

export function getBranchesByZone(branches: Branch[], zoneId: string): Branch[] {
  return branches.filter((branch) => branch.zone_id === zoneId);
}

export function getBranchesByRegion(branches: Branch[], regionId: string): Branch[] {
  return branches.filter((branch) => branch.region_id === regionId);
}

export function getBranchesByDistrict(
  branches: Branch[],
  regionId: string,
  state: string,
  district: string,
): Branch[] {
  return branches.filter(
    (branch) =>
      branch.region_id === regionId && branch.state === state && branch.district === district,
  );
}

export function getDistrictsByRegion(districts: DistrictSummary[], regionId: string): DistrictSummary[] {
  return districts
    .filter((district) => district.region_id === regionId)
    .slice()
    .sort((a, b) => a.district.localeCompare(b.district) || a.state.localeCompare(b.state));
}

export function getRegionsByZone(regions: RegionSummary[], zoneId: string): RegionSummary[] {
  return regions
    .filter((region) => region.zone_id === zoneId)
    .slice()
    .sort((a, b) => a.region_name.localeCompare(b.region_name));
}

export function getBranchCount(branches: Branch[]): number {
  return branches.length;
}

function includes(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}

export function searchBranches(
  query: string,
  branches: Branch[],
  zones: ZoneSummary[],
  regions: RegionSummary[],
  districts: DistrictSummary[],
): SearchGroups {
  const text = query.trim().toLowerCase();
  if (!text) {
    return { zones: [], regions: [], districts: [], branches: [] };
  }

  const zoneHits = zones.filter((zone) => includes(zone.zone_name, text) || zone.zone_id.toLowerCase() === text).slice(0, 8);

  const regionHits = regions
    .filter(
      (region) =>
        includes(region.region_name, text) ||
        includes(region.base_region_name, text) ||
        region.region_id.toLowerCase() === text,
    )
    .sort((a, b) => {
      const rank = (region: RegionSummary) => (region.region_name.toLowerCase() === text ? 0 : 1);
      return rank(a) - rank(b) || b.branch_count - a.branch_count;
    })
    .slice(0, 8);

  const districtHits = districts
    .filter((district) => includes(district.district, text) || includes(district.state, text))
    .sort((a, b) => {
      const rank = (district: DistrictSummary) => (district.district.toLowerCase() === text ? 0 : district.district.toLowerCase().startsWith(text) ? 1 : 2);
      return rank(a) - rank(b) || b.branch_count - a.branch_count;
    })
    .slice(0, 8);

  const branchHits = branches
    .filter((branch) => {
      return (
        branch.branch_code.toLowerCase() === text ||
        branch.pincode.toLowerCase() === text ||
        includes(branch.branch_name, text) ||
        includes(branch.branch_code, text) ||
        includes(branch.city, text) ||
        includes(branch.district, text) ||
        includes(branch.region_name, text) ||
        includes(branch.zone_name, text) ||
        includes(branch.pincode, text) ||
        includes(branch.state, text)
      );
    })
    .slice()
    .sort((a, b) => {
      const score = (branch: Branch) => {
        if (branch.branch_code.toLowerCase() === text) return 0;
        if (branch.pincode.toLowerCase() === text) return 1;
        if (branch.branch_name.toLowerCase() === text) return 2;
        if (branch.branch_name.toLowerCase().startsWith(text)) return 3;
        return 4;
      };
      return score(a) - score(b) || a.branch_name.localeCompare(b.branch_name);
    })
    .slice(0, 12);

  return {
    zones: zoneHits,
    regions: regionHits,
    districts: districtHits,
    branches: branchHits,
  };
}
