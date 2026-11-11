export function formatFull(value: number, unit?: string) {
  const rounded = Math.round(value);
  const text = Math.abs(rounded).toLocaleString("en-AE");
  const signed = rounded < 0 ? `−${text}` : text;
  if (unit === "%" || unit === "percent") return `${Number(value).toLocaleString("en-AE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  if (unit === "hours" || unit === "h") {
    const text = Math.abs(value) < 100 ? value.toLocaleString("en-AE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : signed;
    return `${value < 0 ? "−" : ""}${String(text).replace(/^-/, "")} h`;
  }
  if (unit === "AED") return `AED\u00A0${signed}`;
  if (unit === "count" || unit === "people") return signed;
  return unit ? `${signed} ${unit}` : signed;
}

export function formatCompact(value: number, unit?: string) {
  if (unit === "%" || unit === "percent") return `${Number(value).toLocaleString("en-AE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  if (unit === "hours" || unit === "h") {
    const text = Math.abs(value) < 100 ? Number(value).toLocaleString("en-AE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : Math.round(value).toLocaleString("en-AE");
    return `${text} h`;
  }
  if (unit === "AED") {
    const abs = Math.abs(value);
    const sign = value < 0 ? "−" : "";
    if (abs >= 1_000_000) return `AED\u00A0${sign}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 10_000) return `AED\u00A0${sign}${Math.round(abs / 1000).toLocaleString("en-AE")}K`;
    return `AED\u00A0${sign}${Math.round(abs).toLocaleString("en-AE")}`;
  }
  return Math.round(value).toLocaleString("en-AE");
}

export function formatDelta(change: number | null, compare: string) {
  if (change == null) return compare || "";
  const abs = Math.abs(change).toLocaleString("en-AE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "–";
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${arrow} ${sign}${abs}%${compare ? ` vs ${compare}` : ""}`;
}

export function axisTicks(max: number) {
  if (max <= 0) return [0];
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) || rough;
  const ticks = [];
  for (let value = 0; value <= max * 1.001; value += step) ticks.push(Math.round(value));
  if (ticks.length < 2) ticks.push(Math.ceil(max));
  return ticks.slice(0, 6);
}

export function tickLabel(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString("en-AE", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000).toLocaleString("en-AE")}K`;
  return String(Math.round(value));
}
