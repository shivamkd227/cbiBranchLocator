import { ChevronRight } from "lucide-react";
import { formatLabel } from "../lib/format";
import type { Branch } from "../types";

export function BranchList({
  branches,
  onSelect,
}: {
  branches: Branch[];
  onSelect: (branch: Branch) => void;
}) {
  if (branches.length === 0) {
    return <p className="px-1 py-6 text-sm text-slate-500">No branches found</p>;
  }

  return (
    <ul className="space-y-2">
      {branches.map((branch) => (
        <li key={branch.branch_code}>
          <button
            type="button"
            onClick={() => onSelect(branch)}
            className="flex w-full items-start justify-between gap-3 rounded-2xl border border-line bg-white px-3 py-3 text-left shadow-sm hover:border-navy-700/30 hover:bg-slate-50"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">{formatLabel(branch.branch_name)}</span>
              <span className="mt-1 block text-xs text-slate-500">Branch code {branch.branch_code}</span>
              <span className="block text-xs text-slate-500">
                {[formatLabel(branch.city || branch.district), branch.pincode].filter(Boolean).join(" · ")}
              </span>
            </span>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
