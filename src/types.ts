export interface Employee {
  name: string;
  designation: string;
  dept: string;
}

export interface Branch {
  zone_id: string;
  zone_name: string;
  region_id: string;
  region_name: string;
  base_region_name: string;
  ro_region: string;
  state: string;
  district: string;
  branch_code: string;
  branch_name: string;
  city: string;
  pincode: string;
  serviceability: string;
  center_classification: string;
  territory: string;
  source_page: number | null;
  ifsc?: string;
  micr?: string;
  address?: string;
  landline?: string;
  mobile?: string;
  email?: string;
  employees?: Employee[];
}

export interface ZoneSummary {
  zone_id: string;
  zone_name: string;
  branch_count: number;
  region_count: number;
  district_count: number;
  state_count: number;
}

export interface RegionSummary {
  region_id: string;
  zone_id: string;
  zone_name: string;
  region_name: string;
  base_region_name: string;
  ro_region: string;
  branch_count: number;
  district_count: number;
  states: string[];
}

export interface DistrictSummary {
  zone_id: string;
  zone_name: string;
  region_id: string;
  region_name: string;
  state: string;
  district: string;
  branch_count: number;
}

export type NavLevel = "india" | "zone" | "region" | "district" | "branch";

export interface NavigationState {
  level: NavLevel;
  zoneId: string | null;
  regionId: string | null;
  state: string | null;
  district: string | null;
  branchCode: string | null;
}

export interface SearchGroups {
  zones: ZoneSummary[];
  regions: RegionSummary[];
  districts: DistrictSummary[];
  branches: Branch[];
}

export interface GeoAlias {
  state: string;
  district: string;
  geoDistrict: string;
}
