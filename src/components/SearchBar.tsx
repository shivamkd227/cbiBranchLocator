import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { formatCount, formatLabel } from "../lib/format";
import { useMapNavigation } from "../hooks/useMapNavigation";
import { useSearch } from "../hooks/useSearch";
import type { Branch, DistrictSummary, RegionSummary } from "../types";

export function SearchBar({ className = "" }: { className?: string }) {
  const { query, setQuery, results, isEmpty } = useSearch();
  const { openZone, openRegion, openDistrict, openBranch } = useMapNavigation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  const show = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <label htmlFor="network-search" className="sr-only">
        Search branch, district, region, zone, city, state, or pincode
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        id="network-search"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Search branch, district, region, zone, or pincode"
        className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-9 text-sm text-ink shadow-sm placeholder:text-slate-400"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
      {query && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-ink"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {show && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute z-[500] mt-2 max-h-[70vh] w-full overflow-auto rounded-2xl border border-line bg-white p-2 shadow-float"
        >
          {isEmpty && <p className="px-3 py-6 text-center text-sm text-slate-500">No branches found</p>}
          <ResultGroup title="Zones">
            {results.zones.map((zone) => (
              <ResultButton
                key={zone.zone_id}
                title={formatLabel(zone.zone_name)}
                meta={`${formatCount(zone.region_count)} regions · ${formatCount(zone.branch_count)} branches`}
                onClick={() => {
                  openZone(zone.zone_id);
                  setOpen(false);
                }}
              />
            ))}
          </ResultGroup>
          <ResultGroup title="Regions">
            {results.regions.map((region) => (
              <RegionResult
                key={region.region_id}
                region={region}
                onClick={() => {
                  openRegion(region.zone_id, region.region_id);
                  setOpen(false);
                }}
              />
            ))}
          </ResultGroup>
          <ResultGroup title="Districts">
            {results.districts.map((district) => (
              <DistrictResult
                key={`${district.region_id}-${district.state}-${district.district}`}
                district={district}
                onClick={() => {
                  openDistrict(district.zone_id, district.region_id, district.state, district.district);
                  setOpen(false);
                }}
              />
            ))}
          </ResultGroup>
          <ResultGroup title="Branches">
            {results.branches.map((branch) => (
              <BranchResult
                key={branch.branch_code}
                branch={branch}
                onClick={() => {
                  openBranch(branch);
                  setOpen(false);
                }}
              />
            ))}
          </ResultGroup>
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: ReactNode }) {
  const list = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (list.length === 0) return null;
  return (
    <section className="mb-1">
      <h3 className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function ResultButton({ title, meta, onClick }: { title: string; meta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-slate-50"
      onClick={onClick}
    >
      <span className="text-sm font-semibold text-ink">{title}</span>
      <span className="text-xs text-slate-500">{meta}</span>
    </button>
  );
}

function RegionResult({ region, onClick }: { region: RegionSummary; onClick: () => void }) {
  return (
    <ResultButton
      title={formatLabel(region.region_name)}
      meta={`${formatLabel(region.zone_name)} Zone · ${formatCount(region.branch_count)} branches${region.ro_region === "Yes" ? " · RO" : ""}`}
      onClick={onClick}
    />
  );
}

function DistrictResult({ district, onClick }: { district: DistrictSummary; onClick: () => void }) {
  return (
    <ResultButton
      title={formatLabel(district.district)}
      meta={`${formatLabel(district.state)} · ${formatLabel(district.region_name)} Region · ${formatCount(district.branch_count)} branches`}
      onClick={onClick}
    />
  );
}

function BranchResult({ branch, onClick }: { branch: Branch; onClick: () => void }) {
  return (
    <ResultButton
      title={formatLabel(branch.branch_name)}
      meta={`${branch.branch_code} · ${formatLabel(branch.city)} · ${branch.pincode}`}
      onClick={onClick}
    />
  );
}
