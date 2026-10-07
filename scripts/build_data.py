#!/usr/bin/env python3
"""Convert the CBI branch workbook and simplify India district boundaries.

Source values are copied as stored. Name aliases are used only to join
polygons; they are not written back onto branch records.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
EXCEL = Path("/Users/shivamdubey/Downloads/CBI_Branch_Master_Complete.xlsx")
PDF = Path("/Users/shivamdubey/Downloads/EMPLOYEE_LIST_JUN_2025.pdf")
RAW_DISTRICTS = Path("/tmp/geo/india_district.geojson")
RAW_STATES = Path("/tmp/geo/in-districts.geo.json")
DATA = ROOT / "src" / "data"
GEO = ROOT / "src" / "geo"

# CBI (normalized state, normalized district) -> GeoJSON district name (normalized).
# Used only when the boundary file uses an older or alternate spelling, or when
# a newer district was carved from a 2011 district that still exists in the map.
ALIASES = {
    ("ANDHRA PRADESH", "SRI POTTI SRIRAMULU NELLORE"): "NELLORE",
    ("ANDHRA PRADESH", "Y S R"): "CUDDAPAH",
    ("ANDHRA PRADESH", "VISAKHAPATNAM"): "VISHAKHAPATNAM",
    ("ASSAM", "BAKSA"): "NALBARI",
    ("ASSAM", "CHIRANG"): "BONGAIGAON",
    ("ASSAM", "KAMRUP METROPOLITAN"): "KAMRUP",
    ("BIHAR", "PASCHIMI CHAMPARAN"): "PASHCHIM CHAMPARAN",
    ("BIHAR", "PURBI CHAMPARAN"): "PURBA CHAMPARAN",
    ("BIHAR", "SAHEBGANJ"): "SAHIBGANJ",
    ("CHHATTISGARH", "RAJNANDGAON"): "RAJ NANDGAON",
    ("CHHATTISGARH", "BALOD"): "DURG",
    ("CHHATTISGARH", "BALODABAZAR"): "RAIPUR",
    ("CHHATTISGARH", "BALRAMPUR"): "SURGUJA",
    ("CHHATTISGARH", "BEMETARA"): "DURG",
    ("CHHATTISGARH", "DAKSHIN BASTAR DANTEWADA"): "DANTEWADA",
    ("CHHATTISGARH", "KABEERDHAM"): "KAWARDHA",
    ("CHHATTISGARH", "KONDAGAON"): "BASTAR",
    ("CHHATTISGARH", "MUNGELI"): "BILASPUR",
    ("CHHATTISGARH", "NARAYANPUR"): "BASTAR",
    ("CHHATTISGARH", "SURAJPUR"): "SURGUJA",
    ("CHHATTISGARH", "UTTAR BASTAR KANKER"): "KANKER",
    ("GUJARAT", "AHMEDABAD"): "AHMADABAD",
    ("GUJARAT", "BOTAD"): "BHAVNAGAR",
    ("GUJARAT", "DANGS"): "THE DANGS",
    ("GUJARAT", "DOHAD"): "DAHOD",
    ("GUJARAT", "GIR SOMNATH"): "JUNAGADH",
    ("GUJARAT", "MAHISAGAR"): "PANCH MAHALS",
    ("GUJARAT", "MORBI"): "RAJKOT",
    ("GUJARAT", "TAPI"): "SURAT",
    ("GUJARAT", "BANASKANTHA"): "BANAS KANTHA",
    ("GUJARAT", "SABARKANTHA"): "SABAR KANTHA",
    ("GUJARAT", "PANCHMAHALS"): "PANCH MAHALS",
    ("HARYANA", "SONIPAT"): "SONEPAT",
    ("HARYANA", "YAMUNANAGAR"): "YAMUNA NAGAR",
    ("HARYANA", "GURUGRAM"): "GURGAON",
    ("HARYANA", "CHARKI DADRI"): "BHIWANI",
    ("HARYANA", "PALWAL"): "FARIDABAD",
    ("HARYANA", "MEWAT"): "GURGAON",
    ("HIMACHAL PRADESH", "KULU"): "KULLU",
    ("JAMMU AND KASHMIR", "ANANTNAG"): "ANANTNAG KASHMIR SOUTH",
    ("JAMMU AND KASHMIR", "REASI"): "UDHAMPUR",
    ("JHARKHAND", "LOHARDAGGA"): "LOHARDAGA",
    ("JHARKHAND", "PASCHIMI SINGHBHUM"): "PASHCHIM SINGHBHUM",
    ("JHARKHAND", "PURBI SINGHBHUM"): "PURBA SINGHBHUM",
    ("JHARKHAND", "KHUNTI"): "RANCHI",
    ("JHARKHAND", "RAMGARH"): "HAZARIBAG",
    ("KARNATAKA", "BAGALKOTE"): "BAGALKOT",
    ("KARNATAKA", "BENGALURU RURAL"): "BANGALORE RURAL",
    ("KARNATAKA", "BENGALURU URBAN"): "BANGALORE URBAN",
    ("KARNATAKA", "CHAMARAJANAGAR"): "CHAMRAJNAGAR",
    ("KARNATAKA", "CHIKKAMAGALURU"): "CHIKMAGALUR",
    ("KARNATAKA", "DAVANGERE"): "DAVANAGERE",
    ("KARNATAKA", "SHIVAMOGGA"): "SHIMOGA",
    ("KARNATAKA", "TUMAKURU"): "TUMKUR",
    ("KARNATAKA", "UDIPI"): "UDUPI",
    ("KARNATAKA", "UTTAR KANNAD"): "UTTAR KANNAND",
    ("KARNATAKA", "RAMANAGARA"): "BANGALORE RURAL",
    ("KARNATAKA", "BALLARI"): "BELLARY",
    ("KARNATAKA", "BELAGAVI"): "BELGAUM",
    ("KARNATAKA", "CHIKKABALLAPURA"): "KOLAR",
    ("KARNATAKA", "KALABURAGI"): "GULBARGA",
    ("KARNATAKA", "MYSURU"): "MYSORE",
    ("KARNATAKA", "VIJAYANAGARA"): "BELLARY",
    ("KARNATAKA", "VIJAYAPURA"): "BIJAPUR",
    ("KARNATAKA", "YADGIR"): "GULBARGA",
    ("KERALA", "ALAPUZHA"): "ALAPPUZHA",
    ("KERALA", "PATHANAMTHITTA"): "PATTANAMTITTA",
    ("MADHYA PRADESH", "NARSIMHAPUR"): "NARSINGHPUR",
    ("MADHYA PRADESH", "ALIRAJPUR"): "JHABUA",
    ("MADHYA PRADESH", "SINGRAULI"): "SIDHI",
    ("MAHARASHTRA", "AHMADNAGAR"): "AHMEDNAGAR",
    ("MAHARASHTRA", "BULDHANA"): "BULDANA",
    ("MAHARASHTRA", "GADCHIROLI"): "GARHCHIROLI",
    ("MAHARASHTRA", "GONDIA"): "GONDIYA",
    ("MAHARASHTRA", "NASIK"): "NASHIK",
    ("MAHARASHTRA", "RAIGAD"): "RAIGARH",
    ("MAHARASHTRA", "MUMBAI"): "GREATER BOMBAY",
    ("MAHARASHTRA", "PALGHAR"): "THANE",
    ("ODISHA", "ANUGUL"): "ANGUL",
    ("ODISHA", "KHURDA"): "KHORDHA",
    ("PUNJAB", "FEROZPUR"): "FIROZPUR",
    ("PUNJAB", "FAZILKA"): "FIROZPUR",
    ("PUNJAB", "MALERKOTLA"): "SANGRUR",
    ("PUNJAB", "SAHIBZADA AJIT SINGH NAGAR"): "RUPNAGAR",
    ("PUNJAB", "SHAHID BHAGAT SINGH NAGAR"): "NAWAN SHEHAR",
    ("PUNJAB", "TARN TARAN"): "AMRITSAR",
    ("RAJASTHAN", "JHUNJHUNU"): "JHUNJHUNUN",
    ("TAMIL NADU", "KANYAKUMARI"): "KANNIYAKUMARI",
    ("TAMIL NADU", "TIRUCHIRAPALLI"): "TIRUCHCHIRAPPALLI",
    ("TAMIL NADU", "TOOTHUKUDI"): "THOOTHUKUDI",
    ("TAMIL NADU", "CHENGALPATTU"): "KANCHEEPURAM",
    ("TAMIL NADU", "KRISHNAGIRI"): "DHARMAPURI",
    ("TAMIL NADU", "MAYILADUTHURAI"): "NAGAPATTINAM",
    ("TAMIL NADU", "RANIPET"): "VELLORE",
    ("TAMIL NADU", "TIRUNELVALI"): "TIRUNELVELI KATTABO",
    ("TAMIL NADU", "TIRUPPUR"): "COIMBATORE",
    ("TELANGANA", "SANGAREDDY"): "MEDAK",
    ("TELANGANA", "WARANGAL URBAN"): "WARANGAL",
    ("TELANGANA", "BHADRADRI (KOTHAGUDEM)"): "KHAMMAM",
    ("TELANGANA", "BHADRADRI KOTHAGUDEM"): "KHAMMAM",
    ("TELANGANA", "JAGITIAL"): "KARIMNAGAR",
    ("TELANGANA", "KAMAREDDY"): "NIZAMABAD",
    ("TELANGANA", "MANCHERIAL"): "ADILABAD",
    ("TELANGANA", "MEDCHAL MALKAJGIRI"): "RANGAREDDI",
    ("TELANGANA", "SIDDIPET"): "MEDAK",
    ("TELANGANA", "SURYAPET"): "NALGONDA",
    ("UTTAR PRADESH", "BUDAUN"): "BADAUN",
    ("UTTAR PRADESH", "KANAUJ"): "KANNAUJ",
    ("UTTAR PRADESH", "KUSHI NAGAR"): "KUSHINAGAR",
    ("UTTAR PRADESH", "RAI BARELI"): "RAE BARELI",
    ("UTTAR PRADESH", "SANT RAVIDAS NAGAR"): "SANT RAVI DAS NAGAR",
    ("UTTAR PRADESH", "SIDHARTHANAGAR"): "SIDDHARTH NAGAR",
    ("UTTAR PRADESH", "AYODHYA"): "FAIZABAD",
    ("UTTAR PRADESH", "KANPUR NAGAR"): "KANPUR",
    ("UTTAR PRADESH", "PRAYAGRAJ"): "ALLAHABAD",
    ("UTTAR PRADESH", "AMROHA"): "JYOTIBA PHULE NAGAR",
    ("UTTAR PRADESH", "AMETHI"): "SULTANPUR",
    ("UTTAR PRADESH", "KASGANJ"): "ETAH",
    ("UTTAR PRADESH", "SAMBHAL"): "MORADABAD",
    ("UTTAR PRADESH", "SHAMLI"): "MUZAFFARNAGAR",
    ("UTTARAKHAND", "NAINITAL"): "NAINI TAL",
    ("UTTARAKHAND", "UTTAR KASHI"): "UTTARKASHI",
    ("UTTARAKHAND", "GARHWAL"): "PAURI GARHWAL",
    ("MANIPUR", "IMPHAL WEST"): "WEST IMPHAL",
    ("DELHI", "NEW DELHI"): "DELHI",
    ("BIHAR", "RAI BARELI"): "RAE BARELI",
    ("BIHAR", "SANT RAVIDAS NAGAR"): "SANT RAVI DAS NAGAR",
    ("WEST BENGAL", "KOCH BIHAR"): "KOCHBIHAR",
    ("WEST BENGAL", "PURBA BARDHAMAN"): "BARDDHAMAN",
    ("WEST BENGAL", "PASCHIM BARDHAMAN"): "BARDDHAMAN",
    ("WEST BENGAL", "PASCHIM MEDINIPUR"): "WEST MIDNAPORE",
    ("WEST BENGAL", "PURBA MEDINIPUR"): "EAST MIDNAPORE",
    ("WEST BENGAL", "ALIPURDUAR"): "JALPAIGURI",
    ("NCT OF DELHI", "NEW DELHI"): "DELHI",
    ("DADRA AND NAGAR HAVELI AND DAMAN AND DIU", "DADRA AND NAGAR HAVELI"): "DADRA AND NAGAR HAVELI",
    ("DADRA AND NAGAR HAVELI AND DAMAN AND DIU", "DAMAN"): "DAMAN",
    ("DADRA AND NAGAR HAVELI AND DAMAN AND DIU", "DIU"): "DIU",
}


def norm(value: str) -> str:
    text = str(value or "").upper().replace("&", " AND ")
    text = text.replace(".", " ")
    text = text.replace("(", " ").replace(")", " ")
    text = re.sub(r"[^A-Z0-9 ]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return {
        "UTTARANCHAL": "UTTARAKHAND",
        "ORISSA": "ODISHA",
        "PONDICHERRY": "PUDUCHERRY",
        "NCT OF DELHI": "DELHI",
    }.get(text, text)


def cell(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def thin_ring(points: list[list[float]], min_dist: float) -> list[list[float]]:
    if len(points) < 4:
        return points
    limit = min_dist * min_dist
    kept = [points[0]]
    for point in points[1:-1]:
        last = kept[-1]
        dx = point[0] - last[0]
        dy = point[1] - last[1]
        if dx * dx + dy * dy >= limit:
            kept.append([round(point[0], 4), round(point[1], 4)])
    closing = [round(points[0][0], 4), round(points[0][1], 4)]
    kept[0] = closing
    if kept[-1] != closing:
        kept.append(closing)
    return kept if len(kept) >= 4 else []


def simplify_coords(coords, min_dist: float):
    if not coords:
        return coords
    if isinstance(coords[0][0], (int, float)):
        return thin_ring(coords, min_dist)
    return [part for part in (simplify_coords(part, min_dist) for part in coords) if part]


def load_branches() -> list[dict]:
    wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
    ws = wb["Branch_Master_UI"]
    rows = ws.iter_rows(values_only=True)
    header = [cell(h) for h in next(rows)]
    branches = []
    for row in rows:
        if row[0] is None:
            continue
        record = {header[i]: row[i] for i in range(len(header))}
        branches.append(
            {
                "zone_id": cell(record["zone_id"]),
                "zone_name": cell(record["zone_name"]),
                "region_id": cell(record["region_id"]),
                "region_name": cell(record["region_name"]),
                "base_region_name": cell(record["base_region_name"]),
                "ro_region": cell(record["ro_region"]),
                "state": cell(record["state"]),
                "district": cell(record["district"]),
                "branch_code": cell(record["branch_code"]),
                "branch_name": cell(record["branch_name"]),
                "city": cell(record["city"]),
                "pincode": cell(record["pincode"]),
                "serviceability": cell(record["serviceability"]),
                "center_classification": cell(record["center_classification"]),
                "territory": cell(record["territory"]),
                "source_page": int(record["source_page"]) if record["source_page"] is not None else None,
            }
        )
    wb.close()
    return branches


def write_hierarchy(branches: list[dict]) -> None:
    zones: dict[str, dict] = {}
    regions: dict[str, dict] = {}
    districts: dict[tuple, dict] = {}
    for branch in branches:
        zone = zones.setdefault(
            branch["zone_id"],
            {
                "zone_id": branch["zone_id"],
                "zone_name": branch["zone_name"],
                "branch_count": 0,
                "region_ids": set(),
                "district_keys": set(),
                "states": set(),
            },
        )
        zone["branch_count"] += 1
        zone["region_ids"].add(branch["region_id"])
        zone["district_keys"].add((branch["state"].upper(), branch["district"].upper()))
        zone["states"].add(branch["state"].upper())

        region = regions.setdefault(
            branch["region_id"],
            {
                "region_id": branch["region_id"],
                "zone_id": branch["zone_id"],
                "zone_name": branch["zone_name"],
                "region_name": branch["region_name"],
                "base_region_name": branch["base_region_name"],
                "ro_region": branch["ro_region"],
                "branch_count": 0,
                "district_keys": set(),
                "states": set(),
            },
        )
        region["branch_count"] += 1
        region["district_keys"].add((branch["state"], branch["district"]))
        region["states"].add(branch["state"])

        key = (branch["zone_id"], branch["region_id"], branch["state"], branch["district"])
        district = districts.setdefault(
            key,
            {
                "zone_id": branch["zone_id"],
                "zone_name": branch["zone_name"],
                "region_id": branch["region_id"],
                "region_name": branch["region_name"],
                "state": branch["state"],
                "district": branch["district"],
                "branch_count": 0,
            },
        )
        district["branch_count"] += 1

    zone_rows = []
    for zone in zones.values():
        zone_rows.append(
            {
                "zone_id": zone["zone_id"],
                "zone_name": zone["zone_name"],
                "branch_count": zone["branch_count"],
                "region_count": len(zone["region_ids"]),
                "district_count": len(zone["district_keys"]),
                "state_count": len(zone["states"]),
            }
        )
    region_rows = []
    for region in regions.values():
        region_rows.append(
            {
                "region_id": region["region_id"],
                "zone_id": region["zone_id"],
                "zone_name": region["zone_name"],
                "region_name": region["region_name"],
                "base_region_name": region["base_region_name"],
                "ro_region": region["ro_region"],
                "branch_count": region["branch_count"],
                "district_count": len(region["district_keys"]),
                "states": sorted(region["states"]),
            }
        )
    district_rows = list(districts.values())
    zone_rows.sort(key=lambda row: row["zone_id"])
    region_rows.sort(key=lambda row: row["region_id"])
    district_rows.sort(key=lambda row: (row["zone_id"], row["region_id"], row["state"], row["district"]))

    alias_rows = [
        {"state": norm(state_name), "district": norm(district_name), "geoDistrict": norm(geo_name)}
        for (state_name, district_name), geo_name in sorted(ALIASES.items())
    ]
    (DATA / "geoAliases.json").write_text(json.dumps(alias_rows, ensure_ascii=False, indent=2))
    (DATA / "branches.json").write_text(json.dumps(branches, ensure_ascii=False))
    (DATA / "zones.json").write_text(json.dumps(zone_rows, ensure_ascii=False, indent=2))
    (DATA / "regions.json").write_text(json.dumps(region_rows, ensure_ascii=False, indent=2))
    (DATA / "districts.json").write_text(json.dumps(district_rows, ensure_ascii=False))
    print(f"branches {len(branches)} zones {len(zone_rows)} regions {len(region_rows)} district rows {len(district_rows)}")


def simplify_geo() -> list[dict]:
    raw = json.loads(RAW_DISTRICTS.read_text())
    features = []
    for feature in raw["features"]:
        props = feature["properties"]
        state_name = props["NAME_1"]
        district_name = props["NAME_2"]
        geometry = {
            "type": feature["geometry"]["type"],
            "coordinates": simplify_coords(feature["geometry"]["coordinates"], 0.03),
        }
        if not geometry["coordinates"]:
            continue
        state_norm = norm(state_name)
        district_norm = norm(district_name)
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"{state_norm}|{district_norm}",
                    "state": state_name,
                    "district": district_name,
                    "stateNorm": state_norm,
                    "districtNorm": district_norm,
                },
                "geometry": geometry,
            }
        )
    collection = {"type": "FeatureCollection", "features": features}
    (GEO / "india-districts.geojson").write_text(json.dumps(collection, separators=(",", ":")))
    print("district features", len(features), "bytes", (GEO / "india-districts.geojson").stat().st_size)

    states_raw = json.loads(RAW_STATES.read_text())
    state_features = []
    for feature in states_raw["features"]:
        state_features.append(
            {
                "type": "Feature",
                "properties": {"name": feature["properties"].get("name")},
                "geometry": feature["geometry"],
            }
        )
    (GEO / "india-states.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": state_features}, separators=(",", ":"))
    )
    return features


def report_join(branches: list[dict], features: list[dict]) -> None:
    by_state: dict[str, list[dict]] = defaultdict(list)
    by_district: dict[str, list[dict]] = defaultdict(list)
    for feature in features:
        by_state[feature["properties"]["stateNorm"]].append(feature)
        by_district[feature["properties"]["districtNorm"]].append(feature)

    def candidates(state_norm: str) -> list[str]:
        if state_norm == "TELANGANA":
            return ["TELANGANA", "ANDHRA PRADESH"]
        if "DADRA" in state_norm or "DAMAN" in state_norm:
            return [state_norm, "DADRA AND NAGAR HAVELI", "DAMAN AND DIU"]
        if state_norm == "DELHI":
            return ["DELHI"]
        return [state_norm]

    matched = 0
    unmatched = Counter()
    seen = {}
    for branch in branches:
        state_norm = norm(branch["state"])
        district_norm = norm(branch["district"])
        key = (state_norm, district_norm)
        if key in seen:
            if seen[key]:
                matched += 1
            else:
                unmatched[key] += 1
            continue
        target = ALIASES.get(key, district_norm)
        found = False
        for state_name in candidates(state_norm):
            for feature in by_state.get(state_name, []):
                if feature["properties"]["districtNorm"] == target:
                    found = True
                    break
            if found:
                break
        if not found and len(by_district.get(target, [])) == 1:
            found = True
        seen[key] = found
        if found:
            matched += 1
        else:
            unmatched[key] += 1
    print(f"branch geometry matches {matched}/{len(branches)}")
    print("unmatched district keys", len(unmatched))
    for (state_name, district_name), count in unmatched.most_common():
        print(f"  {count:4} {state_name} | {district_name}")


DESIGNATIONS = sorted(
    [
        "Customer Service Associate",
        "House Keeper cum Office Assistant",
        "Assistant General Manager",
        "Deputy General Manager",
        "Chief General Manager",
        "General Manager",
        "Chief Manager",
        "Senior Manager",
        "Assistant Manager",
        "Special Assistant",
        "Single Window Operator",
        "Office Assistant",
        "Assistant Manager",
        "Manager",
        "Officer",
        "Clerk",
        "Armed Guard",
        "Guard",
        "Messenger",
        "Driver",
        "Sweeper",
        "Peon",
        "Substaff",
        "Executive",
        "Associate",
    ],
    key=len,
    reverse=True,
)


def parse_employees(region_names: list[str]) -> list[dict]:
    if not PDF.exists():
        print("employee pdf missing")
        return []
    from pypdf import PdfReader

    regions = sorted({name.strip() for name in region_names if name.strip()}, key=len, reverse=True)
    reader = PdfReader(str(PDF))
    employees = []
    skipped = 0
    for page in reader.pages:
        for raw_line in (page.extract_text() or "").splitlines():
            line = re.sub(r"\s+", " ", raw_line).strip()
            if not re.match(r"^\d+\s+", line) or "ZONAL OFFICE" not in line:
                if line and not line.startswith("S.NO") and " of 342" not in line:
                    skipped += 1
                continue
            match = re.match(r"^\d+\s+(.*)\s+R0\s+([A-Z0-9 ]+?)\s+ZONAL OFFICE$", line)
            if not match:
                skipped += 1
                continue
            body, zone = match.group(1).strip(), match.group(2).strip()
            region = next((name for name in regions if body.endswith(" " + name) or body == name), "")
            if region:
                body = body[: -(len(region) + 1)].strip()
            designation = ""
            for title in DESIGNATIONS:
                token = f" {title} "
                position = body.rfind(token)
                if position >= 0:
                    designation = title
                    name = body[:position].strip()
                    dept = body[position + len(token) - 1 :].strip()
                    break
                if body.endswith(" " + title):
                    designation = title
                    name = body[: -(len(title) + 1)].strip()
                    dept = ""
                    break
            else:
                name, dept = body, ""
            employees.append(
                {
                    "name": name,
                    "designation": designation,
                    "dept": dept,
                    "region_name": region,
                    "zone_name": zone,
                }
            )
    print(f"employees parsed {len(employees)} skipped {skipped}")
    return employees


def norm_branch_key(value: str) -> str:
    text = norm(value)
    text = re.sub(r"\b(BRANCH|BR|CBI|CENTRAL BANK OF INDIA)\b", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def attach_employees(branches: list[dict], employees: list[dict]) -> None:
    by_zone_region: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for employee in employees:
        by_zone_region[(employee["zone_name"], employee["region_name"])].append(employee)

    matched_employees = 0
    branches_with_staff = 0
    for branch in branches:
        target = norm_branch_key(branch["branch_name"])
        if len(target) < 4:
            branch_employees = []
        else:
            pool = by_zone_region.get((branch["zone_name"], branch["region_name"]), [])
            branch_employees = []
            for employee in pool:
                dept_name = employee["dept"].split("_", 1)[-1] if employee["dept"] else ""
                dept_key = norm_branch_key(dept_name)
                if not dept_key or len(dept_key) < 4:
                    continue
                if dept_key == target:
                    branch_employees.append(
                        {
                            "name": employee["name"],
                            "designation": employee["designation"],
                            "dept": employee["dept"],
                        }
                    )
        if branch_employees:
            branches_with_staff += 1
            matched_employees += len(branch_employees)
        branch["employees"] = branch_employees
    print(f"employee links {matched_employees} across {branches_with_staff} branches")


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    GEO.mkdir(parents=True, exist_ok=True)
    branches = load_branches()
    features = simplify_geo()
    report_join(branches, features)
    employees = parse_employees([branch["region_name"] for branch in branches] + [branch["base_region_name"] for branch in branches])
    attach_employees(branches, employees)
    write_hierarchy(branches)
    (GEO / "NOTICE.txt").write_text(
        "District boundaries are simplified from the MIT-licensed India district "
        "GeoJSON by Sajjad Anwar (https://github.com/geohacker/india).\n"
        "State boundaries are derived from the Highcharts India admin-1 map "
        "(https://code.highcharts.com/mapdata/countries/in/in-all.geo.json).\n"
        "Branch records come from CBI_Branch_Master_Complete.xlsx "
        "(DSBS_cbi_branch_list_07012025.pdf). Coordinates are not present in "
        "that source and are not invented.\n"
        "Employee names, where shown, are parsed from EMPLOYEE_LIST_JUN_2025.pdf "
        "and linked only when the department text matches a branch name inside "
        "the same zone and region.\n"
    )


if __name__ == "__main__":
    main()
