const STATE_ALIASES: Record<string, string> = {
  UTTARANCHAL: "UTTARAKHAND",
  ORISSA: "ODISHA",
  PONDICHERRY: "PUDUCHERRY",
  "NCT OF DELHI": "DELHI",
};

export function normalizePlaceName(value: string | null | undefined): string {
  const text = String(value ?? "")
    .toUpperCase()
    .replaceAll("&", " AND ")
    .replaceAll(".", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return STATE_ALIASES[text] ?? text;
}

export function stateCandidates(stateNorm: string): string[] {
  if (stateNorm === "TELANGANA") return ["TELANGANA", "ANDHRA PRADESH"];
  if (stateNorm.includes("DADRA") || stateNorm.includes("DAMAN")) {
    return [stateNorm, "DADRA AND NAGAR HAVELI", "DAMAN AND DIU"];
  }
  return [stateNorm];
}
