import type { Branch, DistrictSummary, RegionSummary, ZoneSummary } from "../types";

export function deriveSummaries(branches: Branch[]): {
  zones: ZoneSummary[];
  regions: RegionSummary[];
  districts: DistrictSummary[];
} {
  const zones = new Map<string, ZoneSummary & { regionIds: Set<string>; districtKeys: Set<string>; states: Set<string> }>();
  const regions = new Map<string, RegionSummary & { districtKeys: Set<string>; stateSet: Set<string> }>();
  const districts = new Map<string, DistrictSummary>();

  for (const branch of branches) {
    const zone = zones.get(branch.zone_id) ?? {
      zone_id: branch.zone_id,
      zone_name: branch.zone_name,
      branch_count: 0,
      region_count: 0,
      district_count: 0,
      state_count: 0,
      regionIds: new Set<string>(),
      districtKeys: new Set<string>(),
      states: new Set<string>(),
    };
    zone.branch_count += 1;
    zone.regionIds.add(branch.region_id);
    zone.districtKeys.add(`${branch.state.toUpperCase()}|${branch.district.toUpperCase()}`);
    zone.states.add(branch.state.toUpperCase());
    zones.set(branch.zone_id, zone);

    const region = regions.get(branch.region_id) ?? {
      region_id: branch.region_id,
      zone_id: branch.zone_id,
      zone_name: branch.zone_name,
      region_name: branch.region_name,
      base_region_name: branch.base_region_name,
      ro_region: branch.ro_region,
      branch_count: 0,
      district_count: 0,
      states: [],
      districtKeys: new Set<string>(),
      stateSet: new Set<string>(),
    };
    region.branch_count += 1;
    region.districtKeys.add(`${branch.state}|${branch.district}`);
    region.stateSet.add(branch.state);
    regions.set(branch.region_id, region);

    const districtKey = `${branch.zone_id}|${branch.region_id}|${branch.state}|${branch.district}`;
    const district = districts.get(districtKey) ?? {
      zone_id: branch.zone_id,
      zone_name: branch.zone_name,
      region_id: branch.region_id,
      region_name: branch.region_name,
      state: branch.state,
      district: branch.district,
      branch_count: 0,
    };
    district.branch_count += 1;
    districts.set(districtKey, district);
  }

  return {
    zones: [...zones.values()]
      .map((zone) => ({
        zone_id: zone.zone_id,
        zone_name: zone.zone_name,
        branch_count: zone.branch_count,
        region_count: zone.regionIds.size,
        district_count: zone.districtKeys.size,
        state_count: zone.states.size,
      }))
      .sort((a, b) => a.zone_id.localeCompare(b.zone_id)),
    regions: [...regions.values()]
      .map((region) => ({
        region_id: region.region_id,
        zone_id: region.zone_id,
        zone_name: region.zone_name,
        region_name: region.region_name,
        base_region_name: region.base_region_name,
        ro_region: region.ro_region,
        branch_count: region.branch_count,
        district_count: region.districtKeys.size,
        states: [...region.stateSet].sort(),
      }))
      .sort((a, b) => a.region_id.localeCompare(b.region_id)),
    districts: [...districts.values()].sort((a, b) =>
      a.zone_id.localeCompare(b.zone_id) ||
      a.region_id.localeCompare(b.region_id) ||
      a.state.localeCompare(b.state) ||
      a.district.localeCompare(b.district),
    ),
  };
}
