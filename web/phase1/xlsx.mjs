const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(view, offset, value) { view.setUint16(offset, value, true); }
function u32(view, offset, value) { view.setUint32(offset, value, true); }

async function deflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function zipStore(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const raw = file.data;
    const compressed = await deflateRaw(raw);
    const crc = crc32(raw);
    const local = new Uint8Array(30 + name.length + compressed.length);
    const view = new DataView(local.buffer);
    u32(view, 0, 0x04034b50);
    u16(view, 4, 20);
    u16(view, 8, 8);
    u32(view, 14, crc);
    u32(view, 18, compressed.length);
    u32(view, 22, raw.length);
    u16(view, 26, name.length);
    local.set(name, 30);
    local.set(compressed, 30 + name.length);
    locals.push(local);
    const entry = new Uint8Array(46 + name.length);
    const centralView = new DataView(entry.buffer);
    u32(centralView, 0, 0x02014b50);
    u16(centralView, 4, 20);
    u16(centralView, 6, 20);
    u16(centralView, 10, 8);
    u32(centralView, 16, crc);
    u32(centralView, 20, compressed.length);
    u32(centralView, 24, raw.length);
    u16(centralView, 28, name.length);
    u32(centralView, 42, offset);
    entry.set(name, 46);
    central.push(entry);
    offset += local.length;
  }
  const centralSize = central.reduce((sum, entry) => sum + entry.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  u32(endView, 0, 0x06054b50);
  u16(endView, 8, files.length);
  u16(endView, 10, files.length);
  u32(endView, 12, centralSize);
  u32(endView, 16, offset);
  const parts = [...locals, ...central, end];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const part of parts) { out.set(part, cursor); cursor += part.length; }
  return out;
}

function findEocd(bytes) {
  const start = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= start; i -= 1) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  throw new Error("Not a zip");
}

export async function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(bytes);
  const count = view.getUint16(eocd + 8, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files = new Map();
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Bad central directory");
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (!data) throw new Error("Unsupported zip method");
    files.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[char]));
}

function decodeXml(value) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

const SHEET_HEADER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;

export async function buildWorkbook(rows) {
  const columns = Object.keys(rows[0] || { Value: "" });
  const sheetRows = [columns, ...rows.map((row) => columns.map((column) => row[column]))];
  const cells = sheetRows.map((row, rowIndex) => {
    const rendered = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value ?? "")}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${rendered}</row>`;
  }).join("");
  const sheet = `${SHEET_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cells}</sheetData></worksheet>`;
  const files = [
    { name: "[Content_Types].xml", data: text(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`) },
    { name: "_rels/.rels", data: text(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", data: text(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Ownership" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: text(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`) },
    { name: "xl/worksheets/sheet1.xml", data: text(sheet) }
  ];
  return zipStore(files);
}

function text(value) { return new TextEncoder().encode(value); }

function columnName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) { const rem = (n - 1) % 26; name = String.fromCharCode(65 + rem) + name; n = Math.floor((n - 1) / 26); }
  return name;
}

function columnIndex(ref) {
  const letters = String(ref).match(/[A-Z]+/)?.[0] || "A";
  let n = 0;
  for (const char of letters) n = n * 26 + char.charCodeAt(0) - 64;
  return n - 1;
}

export function excelSerialToIso(serial) {
  const utc = Date.UTC(1899, 11, 30) + Math.round(Number(serial)) * 86400000;
  return new Date(utc).toISOString().slice(0, 10);
}

export async function readSheetRows(bytes) {
  const files = await unzip(bytes);
  const sheetName = [...files.keys()].find((name) => name.replace(/\\/g, "/").endsWith("xl/worksheets/sheet1.xml"));
  if (!sheetName) throw new Error("Workbook has no sheet");
  const sheet = new TextDecoder().decode(files.get(sheetName));
  const sharedName = [...files.keys()].find((name) => name.replace(/\\/g, "/").endsWith("xl/sharedStrings.xml"));
  const shared = sharedName ? readSharedStrings(new TextDecoder().decode(files.get(sharedName))) : [];
  const rows = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const values = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = / r="([^"]+)"/.exec(cellMatch[1])?.[1] || "";
      const type = / t="([^"]+)"/.exec(cellMatch[1])?.[1] || "";
      const body = cellMatch[2] || "";
      values[columnIndex(ref)] = cellText(type, body, shared);
    }
    rows.push(values.map((value) => value ?? ""));
  }
  return rows;
}

function readSharedStrings(xml) {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => decodeXml([...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join("")));
}

function cellText(type, body, shared) {
  if (type === "inlineStr") return decodeXml([...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join(""));
  const raw = decodeXml(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] || "");
  if (type === "s") return shared[Number(raw)] || "";
  return raw;
}
