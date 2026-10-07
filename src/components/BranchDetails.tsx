import { formatLabel } from "../lib/format";
import { useBranchData } from "../hooks/useBranchData";

export function BranchDetails({ branchCode }: { branchCode: string }) {
  const { byCode } = useBranchData();
  const branch = byCode.get(branchCode);
  if (!branch) return <p className="text-sm text-slate-500">Data unavailable for this selection</p>;

  const fields = [
    { label: "Branch code", value: branch.branch_code },
    { label: "IFSC", value: branch.ifsc },
    { label: "MICR", value: branch.micr },
    { label: "Address", value: branch.address ? formatLabel(branch.address) : "" },
    { label: "Location", value: [formatLabel(branch.city), formatLabel(branch.state)].filter(Boolean).join(", ") },
    { label: "District", value: formatLabel(branch.district) },
    { label: "Region", value: formatLabel(branch.region_name) },
    { label: "Base region", value: branch.base_region_name && branch.base_region_name !== branch.region_name ? formatLabel(branch.base_region_name) : "" },
    { label: "RO region", value: branch.ro_region === "Yes" ? branch.ro_region : "" },
    { label: "Zone", value: formatLabel(branch.zone_name) },
    { label: "Pincode", value: branch.pincode },
    { label: "Landline", value: branch.landline },
    { label: "Mobile", value: branch.mobile },
    { label: "Email", value: branch.email },
    { label: "Serviceability", value: formatLabel(branch.serviceability) },
    { label: "Classification", value: branch.center_classification },
    { label: "Territory", value: formatLabel(branch.territory) },
  ].filter((field) => field.value);

  const employees = branch.employees ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Branch</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">{formatLabel(branch.branch_name)}</h2>
        <p className="mt-1 text-sm text-slate-500">Central Bank of India</p>
      </div>
      <dl className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {fields.map((field) => (
          <div key={field.label} className="grid grid-cols-[120px_1fr] gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{field.label}</dt>
            <dd className="text-sm font-semibold text-ink">{field.value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Employees</h3>
        {employees.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-3 py-4 text-sm text-slate-500">
            No employee record in the June 2025 list matched this branch name inside the same zone and region.
          </p>
        ) : (
          <ul className="space-y-2">
            {employees.map((employee, index) => (
              <li key={`${employee.name}-${index}`} className="rounded-2xl border border-line bg-white px-3 py-2.5 shadow-sm">
                <p className="text-sm font-semibold text-ink">{employee.name}</p>
                <p className="text-xs text-slate-500">{employee.designation || "Designation unavailable"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
