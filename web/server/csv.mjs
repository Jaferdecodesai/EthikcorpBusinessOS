export function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#"));
  if (!lines.length) return { columns: [], rows: [] };
  const columns = splitCsv(lines[0]);
  const rows = lines.slice(1).filter((line) => line.trim()).map((line) => {
    const cells = splitCsv(line);
    const row = {};
    columns.forEach((column, index) => {
      const value = cells[index] ?? "";
      row[column] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    });
    return row;
  });
  return { columns, rows };
}

function splitCsv(line) {
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
