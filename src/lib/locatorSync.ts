import type { Branch, DistrictSummary, RegionSummary, ZoneSummary } from "../types";
import { deriveSummaries } from "./summaries";

const LOCATOR_URL = "/api/cbi-locator";
const SAVE_URL = "/api/save-master";

export interface SyncProgress {
  phase: "states" | "state" | "saving";
  stateTotal: number;
  statesDone: number;
  currentState: string;
  districtsDone: number;
  districtTotal: number;
  branches: number;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function blank(value: string): string {
  const text = decodeHtml(value);
  if (!text || text.toUpperCase() === "NA" || text.toUpperCase() === "N/A") return "";
  return text;
}

export function parseOptions(html: string): string[] {
  const values: string[] = [];
  const pattern = /<option\b[^>]*value="([^"]*)"/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const value = decodeHtml(match[1]);
    if (value) values.push(value);
  }
  return values;
}

export function parseBranchRows(html: string): string[][] {
  if (/no-data/i.test(html) || !/<td>/i.test(html)) return [];
  const rows: string[][] = [];
  const pattern = /<tr>\s*<td>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const cells = match[1].split(/<\/td>\s*<td>/i).map((cell) => blank(cell.replace(/<\/?[^>]+>/g, "")));
    if (cells.length >= 10 && cells[0]) rows.push(cells);
  }
  return rows;
}

async function postLocator(body: URLSearchParams): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(LOCATOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body,
      });
      if (!response.ok) throw new Error(`Locator request failed (${response.status})`);
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Locator request failed");
}

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function classificationLabel(value: string): string {
  const parts = value.split(":");
  return (parts[parts.length - 1] ?? value).trim();
}

function regionMeta(regionName: string): { base: string; ro: string } {
  if (/\sRO$/i.test(regionName)) {
    return { base: regionName.replace(/\sRO$/i, "").trim(), ro: "Yes" };
  }
  return { base: regionName, ro: "No" };
}

function sameText(left: string, right: string): boolean {
  return left.trim().toUpperCase() === right.trim().toUpperCase();
}

export async function syncBranchMaster(
  onProgress: (progress: SyncProgress) => void,
): Promise<{ branches: Branch[]; zones: ZoneSummary[]; regions: RegionSummary[]; districts: DistrictSummary[] }> {
  try {
    localStorage.removeItem("cbi-branch-master");
  } catch {
    // A blocked store must not keep the previous master in the rebuild.
  }
  const report = (progress: SyncProgress) => onProgress(progress);
  report({ phase: "states", stateTotal: 0, statesDone: 0, currentState: "", districtsDone: 0, districtTotal: 0, branches: 0 });
  const stateHtml = await postLocator(new URLSearchParams({ action: "getState" }));
  const states = parseOptions(stateHtml);
  if (states.length === 0) throw new Error("The state list came back empty");
  report({ phase: "states", stateTotal: states.length, statesDone: 0, currentState: "", districtsDone: 0, districtTotal: 0, branches: 0 });

  const collected: Branch[] = [];
  let statesDone = 0;
  for (const state of states) {
    const districtHtml = await postLocator(new URLSearchParams({ action: "getDist", state_id: state }));
    const districts = parseOptions(districtHtml);
    let districtsDone = 0;
    report({
      phase: "state",
      stateTotal: states.length,
      statesDone,
      currentState: state,
      districtsDone: 0,
      districtTotal: districts.length,
      branches: collected.length,
    });
    await mapPool(districts, 4, async (district) => {
      let html = "";
      try {
        html = await postLocator(new URLSearchParams({ action: "getalldata", district }));
      } catch {
        districtsDone += 1;
        report({
          phase: "state",
          stateTotal: states.length,
          statesDone,
          currentState: state,
          districtsDone,
          districtTotal: districts.length,
          branches: collected.length,
        });
        return;
      }
      const rows = parseBranchRows(html);
      const matched = rows.filter((cells) => sameText(cells[7] ?? "", state) && sameText(cells[6] ?? "", district));
      const usable = matched.length > 0 ? matched : rows.filter((cells) => sameText(cells[6] ?? "", district));
      for (const cells of usable) {
        const regionName = cells[4] || "UNKNOWN";
        const zoneName = cells[5] || "UNKNOWN";
        const meta = regionMeta(regionName);
        collected.push({
          zone_id: "",
          zone_name: zoneName,
          region_id: "",
          region_name: regionName,
          base_region_name: meta.base,
          ro_region: meta.ro,
          state: cells[7] || state,
          district: cells[6] || district,
          branch_code: cells[0],
          branch_name: cells[1],
          city: "",
          pincode: cells[9] || "",
          serviceability: "",
          center_classification: classificationLabel(cells[10] || ""),
          territory: "",
          source_page: null,
          ifsc: cells[2] || "",
          micr: cells[3] || "",
          address: cells[8] || "",
          landline: cells[11] || "",
          mobile: cells[12] || "",
          email: cells[13] || "",
        });
      }
      districtsDone += 1;
      report({
        phase: "state",
        stateTotal: states.length,
        statesDone,
        currentState: state,
        districtsDone,
        districtTotal: districts.length,
        branches: collected.length,
      });
    });
    statesDone += 1;
    report({
      phase: "state",
      stateTotal: states.length,
      statesDone,
      currentState: state,
      districtsDone: districts.length,
      districtTotal: districts.length,
      branches: collected.length,
    });
  }

  if (collected.length === 0) throw new Error("No branches were returned");

  const byCode = new Map<string, Branch>();
  for (const branch of collected) {
    if (!byCode.has(branch.branch_code)) byCode.set(branch.branch_code, branch);
  }

  const zoneNames = [...new Set([...byCode.values()].map((branch) => branch.zone_name))].sort((a, b) => a.localeCompare(b));
  const zoneIds = new Map(zoneNames.map((name, index) => [name, `Z${String(index + 1).padStart(2, "0")}`]));
  const regionKeys = [...new Set([...byCode.values()].map((branch) => `${branch.zone_name}||${branch.region_name}`))].sort((a, b) => a.localeCompare(b));
  const regionIds = new Map(regionKeys.map((key, index) => [key, `R${String(index + 1).padStart(3, "0")}`]));

  const branches = [...byCode.values()].map((branch) => ({
    ...branch,
    zone_id: zoneIds.get(branch.zone_name) ?? "Z00",
    region_id: regionIds.get(`${branch.zone_name}||${branch.region_name}`) ?? "R000",
  }));
  branches.sort((a, b) => a.zone_id.localeCompare(b.zone_id) || a.region_id.localeCompare(b.region_id) || a.branch_code.localeCompare(b.branch_code));

  const summaries = deriveSummaries(branches);
  onProgress({
    phase: "saving",
    stateTotal: states.length,
    statesDone: states.length,
    currentState: "",
    districtsDone: 0,
    districtTotal: 0,
    branches: branches.length,
  });

  try {
    localStorage.setItem("cbi-branch-master", JSON.stringify(branches));
  } catch {
    // The running app still receives the new records if storage is full.
  }

  const saveResponse = await fetch(SAVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branches, ...summaries }),
  });
  if (!saveResponse.ok) {
    const detail = await saveResponse.text();
    throw new Error(detail || "Branch data was loaded but the master files could not be saved");
  }

  return { branches, ...summaries };
}
