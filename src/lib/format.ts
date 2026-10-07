const ACRONYMS = new Set(["RO", "MMZO", "NCT", "OG", "M"]);

export function formatLabel(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part)) return part;
      const bare = part.replace(/[^A-Za-z]/g, "");
      if (ACRONYMS.has(bare.toUpperCase()) && bare.length <= 4) {
        return part.toUpperCase();
      }
      return part
        .split(/([^A-Za-z0-9]+)/)
        .map((chunk) => {
          if (!/[A-Za-z]/.test(chunk)) return chunk;
          const lower = chunk.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join("");
    })
    .join("");
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

export function districtKey(state: string, district: string): string {
  return `${state}||${district}`;
}
