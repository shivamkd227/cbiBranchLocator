import districtGeo from "../geo/india-districts.geojson";
import stateGeo from "../geo/india-states.geojson";
import aliases from "../data/geoAliases.json";
import type { Branch, GeoAlias } from "../types";
import { normalizePlaceName, stateCandidates } from "./normalize";

export interface MapFeature {
  type: "Feature";
  properties: {
    id: string;
    state: string;
    district: string;
    stateNorm: string;
    districtNorm: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

export interface FeatureNetwork {
  featureId: string;
  geoState: string;
  geoDistrict: string;
  branches: Branch[];
  zoneCounts: { zoneId: string; zoneName: string; count: number }[];
  regionCounts: { regionId: string; regionName: string; zoneId: string; count: number }[];
  districtCounts: { state: string; district: string; count: number }[];
  dominantZoneId: string | null;
}

const aliasList = aliases as GeoAlias[];
const aliasMap = new Map(aliasList.map((row) => [`${row.state}|${row.district}`, row.geoDistrict]));

export const districtCollection = districtGeo as unknown as {
  type: "FeatureCollection";
  features: MapFeature[];
};

export const stateCollection = stateGeo as unknown as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { name?: string };
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
  }>;
};

export function buildFeatureNetwork(branches: Branch[]): Map<string, FeatureNetwork> {
  const features = districtCollection.features;
  const byState = new Map<string, MapFeature[]>();
  const byDistrict = new Map<string, MapFeature[]>();
  for (const feature of features) {
    const stateNorm = feature.properties.stateNorm;
    const districtNorm = feature.properties.districtNorm;
    const stateBucket = byState.get(stateNorm) ?? [];
    stateBucket.push(feature);
    byState.set(stateNorm, stateBucket);
    const districtBucket = byDistrict.get(districtNorm) ?? [];
    districtBucket.push(feature);
    byDistrict.set(districtNorm, districtBucket);
  }

  const resolved = new Map<string, MapFeature | null>();
  const resolve = (state: string, district: string): MapFeature | null => {
    const stateNorm = normalizePlaceName(state);
    const districtNorm = normalizePlaceName(district);
    const cacheKey = `${stateNorm}|${districtNorm}`;
    if (resolved.has(cacheKey)) return resolved.get(cacheKey) ?? null;
    const target = aliasMap.get(cacheKey) ?? districtNorm;
    let match: MapFeature | null = null;
    for (const candidate of stateCandidates(stateNorm)) {
      const pool = byState.get(candidate) ?? [];
      match = pool.find((feature) => feature.properties.districtNorm === target) ?? null;
      if (match) break;
    }
    if (!match) {
      const global = byDistrict.get(target) ?? [];
      if (global.length === 1) match = global[0];
    }
    resolved.set(cacheKey, match);
    return match;
  };

  const network = new Map<string, FeatureNetwork>();
  for (const feature of features) {
    network.set(feature.properties.id, {
      featureId: feature.properties.id,
      geoState: feature.properties.state,
      geoDistrict: feature.properties.district,
      branches: [],
      zoneCounts: [],
      regionCounts: [],
      districtCounts: [],
      dominantZoneId: null,
    });
  }

  for (const branch of branches) {
    const feature = resolve(branch.state, branch.district);
    if (!feature) continue;
    const entry = network.get(feature.properties.id);
    if (entry) entry.branches.push(branch);
  }

  for (const entry of network.values()) {
    const zones = new Map<string, { zoneId: string; zoneName: string; count: number }>();
    const regions = new Map<string, { regionId: string; regionName: string; zoneId: string; count: number }>();
    const districts = new Map<string, { state: string; district: string; count: number }>();
    for (const branch of entry.branches) {
      const zone = zones.get(branch.zone_id) ?? {
        zoneId: branch.zone_id,
        zoneName: branch.zone_name,
        count: 0,
      };
      zone.count += 1;
      zones.set(branch.zone_id, zone);
      const region = regions.get(branch.region_id) ?? {
        regionId: branch.region_id,
        regionName: branch.region_name,
        zoneId: branch.zone_id,
        count: 0,
      };
      region.count += 1;
      regions.set(branch.region_id, region);
      const key = `${branch.state}||${branch.district}`;
      const district = districts.get(key) ?? { state: branch.state, district: branch.district, count: 0 };
      district.count += 1;
      districts.set(key, district);
    }
    entry.zoneCounts = [...zones.values()].sort((a, b) => b.count - a.count);
    entry.regionCounts = [...regions.values()].sort((a, b) => b.count - a.count);
    entry.districtCounts = [...districts.values()].sort((a, b) => b.count - a.count);
    entry.dominantZoneId = entry.zoneCounts[0]?.zoneId ?? null;
  }

  return network;
}

export function featureIdsForSelection(
  network: Map<string, FeatureNetwork>,
  filter: (branch: Branch) => boolean,
): Set<string> {
  const ids = new Set<string>();
  for (const entry of network.values()) {
    if (entry.branches.some(filter)) ids.add(entry.featureId);
  }
  return ids;
}
