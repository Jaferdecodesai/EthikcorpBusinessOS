export function parseCsv(text) {
  const comments = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("#"));
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#"));
  if (!lines.length) return { columns: [], rows: [], schema: [], comments };
  const columns = splitCsv(lines[0]);
  const rows = lines.slice(1).filter((line) => line.trim()).map((line) => {
    const cells = splitCsv(line);
    const row = {};
    columns.forEach((column, index) => { row[column] = coerce(cells[index] ?? ""); });
    return row;
  });
  const schema = columns.map((name) => ({ name, type: inferType(rows.map((row) => row[name])) }));
  return { columns, rows, schema, comments };
}

export function splitCsv(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") { current += "\""; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { cells.push(current); current = ""; }
    else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function coerce(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const money = value.match(/^AED\s+(-?[\d,]+(?:\.\d+)?)$/i);
  const numeric = money ? money[1] : value;
  if (/^-?[\d,]+(?:\.\d+)?%?$/.test(numeric)) return Number(numeric.replace(/,/g, "").replace(/%$/, ""));
  return value;
}

function inferType(values) {
  const present = values.filter((value) => value !== "" && value != null);
  if (!present.length) return "empty";
  if (present.every((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))) return "date";
  if (present.every((value) => typeof value === "string" && /^\d{4}-\d{2}$/.test(value))) return "month";
  if (present.every((value) => typeof value === "number")) return "number";
  return "string";
}
