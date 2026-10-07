import { RefreshCw, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { SearchBar } from "./SearchBar";
import { StatsCards } from "./StatsCards";
import { useBranchData } from "../hooks/useBranchData";
import { useMapNavigation } from "../hooks/useMapNavigation";
import { formatLabel } from "../lib/format";
import { syncBranchMaster, type SyncProgress } from "../lib/locatorSync";

function UpdateProgress({ progress }: { progress: SyncProgress }) {
  const districtPercent =
    progress.districtTotal > 0 ? Math.min(100, Math.round((progress.districtsDone / progress.districtTotal) * 100)) : 0;
  return (
    <div className="mt-3 max-w-md space-y-2 rounded-2xl border border-line bg-white px-3 py-3 shadow-sm" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">States</span>
        <span className="font-semibold text-ink">
          {progress.stateTotal === 0 ? "Loading total…" : `${progress.statesDone} / ${progress.stateTotal} completed`}
        </span>
      </div>
      {progress.phase === "state" && (
        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-ink">{formatLabel(progress.currentState)}</span>
            <span className="shrink-0 text-slate-600">
              {progress.districtsDone}/{progress.districtTotal || 0} districts
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-navy-800 transition-[width]" style={{ width: `${districtPercent}%` }} />
          </div>
        </div>
      )}
      {progress.phase === "saving" && <p className="text-sm text-slate-600">Saving the new branch master…</p>}
      <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
        <span className="text-slate-500">Branches fetched</span>
        <span className="font-semibold text-ink">{progress.branches.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

export function Header() {
  const { reset, nav } = useMapNavigation();
  const { replaceBranches } = useBranchData();
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [status, setStatus] = useState("");
  const updating = progress !== null;

  const updateMaster = async () => {
    setStatus("");
    setProgress({
        phase: "states",
        stateTotal: 0,
        statesDone: 0,
        currentState: "",
        districtsDone: 0,
        districtTotal: 0,
        branches: 0,
      });
    try {
      const result = await syncBranchMaster(setProgress);
      replaceBranches(result.branches);
      reset();
      setStatus(`Rebuilt ${result.branches.length.toLocaleString("en-IN")} branches from the Central Bank locator. Previous master data was replaced.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Branch update failed");
    } finally {
      setProgress(null);
    }
  };

  return (
    <header className="relative z-[800] border-b border-line bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy-900 text-[11px] font-bold tracking-wide text-white">
            CBI
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">Central Bank of India</p>
            <p className="truncate text-xs text-slate-500">Branch Network Explorer</p>
          </div>
        </div>
        <SearchBar className="hidden min-w-0 flex-1 md:block" />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void updateMaster()}
            disabled={updating}
            aria-busy={updating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-navy-700 bg-navy-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${updating ? "animate-spin" : ""}`} aria-hidden="true" />
            {updating ? "Updating…" : "Update all branch data"}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={nav.level === "india" || updating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-navy-800 shadow-sm hover:bg-slate-50 disabled:cursor-default disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset view
          </button>
        </div>
      </div>
      {progress && <UpdateProgress progress={progress} />}
      {status && (
        <p className="mt-2 text-xs text-slate-600" role="status">
          {status}
        </p>
      )}
      <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <StatsCards />
        <Breadcrumbs />
      </div>
    </header>
  );
}
