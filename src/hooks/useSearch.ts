import { useDeferredValue, useMemo, useState } from "react";
import { searchBranches } from "../lib/queries";
import type { SearchGroups } from "../types";
import { useBranchData } from "./useBranchData";

const EMPTY: SearchGroups = { zones: [], regions: [], districts: [], branches: [] };

export function useSearch() {
  const { branches, zones, regions, districts } = useBranchData();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const results = useMemo(() => {
    if (!deferred.trim()) return EMPTY;
    return searchBranches(deferred, branches, zones, regions, districts);
  }, [deferred, branches, zones, regions, districts]);
  const total =
    results.zones.length + results.regions.length + results.districts.length + results.branches.length;

  return { query, setQuery, results, total, isEmpty: deferred.trim().length > 0 && total === 0 };
}
