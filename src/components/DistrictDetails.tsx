import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCount, formatLabel } from "../lib/format";
import { useBranchData } from "../hooks/useBranchData";
import { useMapNavigation } from "../hooks/useMapNavigation";
import { BranchList } from "./BranchList";

export function DistrictDetails({
  regionId,
  state,
  district,
}: {
  regionId: string;
  state: string;
  district: string;
}) {
  const { regions, byDistrict } = useBranchData();
  const { openBranch } = useMapNavigation();
  const [query, setQuery] = useState("");
  const region = regions.find((item) => item.region_id === regionId);
  const branches = byDistrict.get(`${regionId}|${state}|${district}`) ?? [];
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return branches;
    return branches.filter(
      (branch) =>
        branch.branch_name.toLowerCase().includes(text) ||
        branch.branch_code.toLowerCase().includes(text) ||
        branch.city.toLowerCase().includes(text) ||
        branch.pincode.includes(text),
    );
  }, [branches, query]);

  if (!region || branches.length === 0) {
    return <p className="text-sm text-slate-500">Data unavailable for this selection</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{formatLabel(region.region_name)} Region</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">{formatLabel(district)} District</h2>
        <p className="mt-1 text-sm text-slate-500">Central Bank of India</p>
      </div>
      <div className="rounded-2xl border border-line bg-white px-3 py-2 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">Branches</div>
        <div className="text-lg font-semibold text-ink">{formatCount(branches.length)}</div>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <label htmlFor="district-branch-search" className="sr-only">
          Search branches
        </label>
        <input
          id="district-branch-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search branches..."
          className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm"
        />
      </div>
      <BranchList branches={filtered} onSelect={openBranch} />
    </div>
  );
}
