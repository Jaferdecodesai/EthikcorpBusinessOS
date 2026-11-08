/** Build the editable client template from the same 18-category data as the app. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const docx = require("docx");
const ts = require(require.resolve("typescript", { paths: [path.join(root, "web/node_modules")] }));
const sourceCode = fs.readFileSync(path.join(root, "web/src/data.ts"), "utf8");
const compiled = ts.transpileModule(sourceCode, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const data = {};
vm.runInNewContext(compiled, { exports: data });
const sources = data.sources;
if (!Array.isArray(sources) || sources.length !== 18) throw new Error("Expected 18 source categories from the app.");

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, HeadingLevel, WidthType, BorderStyle, ShadingType, PageNumber } = docx;
const INK = "17343D", TEAL = "126B67", MUTED = "536B6A", LINE = "D6E3DE", PALE = "EBF3EF";
const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };
const blank = "[Client to complete]";
const text = (value, options = {}) => new TextRun({ text: value, font: "Arial", ...options });
const para = (value, options = {}) => new Paragraph({ children: [text(value, options.run || {})], spacing: { after: options.after ?? 100, before: options.before ?? 0 }, style: options.style });
const heading = (value, level = 1) => new Paragraph({ heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, keepNext: true, children: [text(value)] });
const inputCell = (value, width, shaded = false) => new TableCell({ width: { size: width, type: WidthType.DXA }, borders, shading: shaded ? { fill: PALE, type: ShadingType.CLEAR } : undefined, children: [para(value, { after: 45, run: { size: 20, color: shaded ? TEAL : MUTED, bold: shaded } })] });
const row = (labelA, valueA, labelB, valueB) => new TableRow({ children: [inputCell(labelA, 1560, true), inputCell(valueA, 3440), inputCell(labelB, 1560, true), inputCell(valueB, 3440)] });
const twoFieldTable = (rows) => new Table({ columnWidths: [1560, 3440, 1560, 3440], margins: { top: 70, bottom: 70, left: 85, right: 85 }, rows: rows.map((r) => row(...r)) });
const info = (label, value) => new Paragraph({ spacing: { after: 70 }, children: [text(label + "  ", { bold: true, color: TEAL, size: 18 }), text(value, { color: INK, size: 18 })] });
const children = [];

children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [text("Discovery & inventory", { color: INK })] }));
children.push(para("ETHIKCORP  /  SUPERBRAIN PM  /  CLIENT WORKING TEMPLATE", { after: 260, run: { bold: true, color: TEAL, size: 19 } }));
children.push(para("Purpose: establish the people, source systems, access boundaries and approval decisions needed before any collection or GBrain import. This is a blank client template. Suggested owners, examples and locations come from the setup reference and require Ethikcorp confirmation.", { after: 170 }));
children.push(para("How to return it: complete the editable Word file, keep a copy in Ethikcorp's approved private project workspace, and share it only through the client-approved route. Do not put passwords, API keys, HR records, client contracts or other sensitive files into this form. Record their system/location and approval path instead.", { after: 210 }));

children.push(heading("1. Project ownership and scope"));
children.push(twoFieldTable([
  ["Executive sponsor", blank, "Project owner", blank],
  ["Privacy lead", blank, "Security / IT lead", blank],
  ["Pilot departments", blank, "Target decision date", blank],
  ["Business goal", blank, "Baseline measure", blank],
  ["Working location", blank, "Document version / date", blank]
]));
children.push(para("Client action: name the person with authority to approve the source register and the departmental leads who can identify authoritative material. Define the first pilot departments and the outcomes to measure; leave productivity claims unfilled until a baseline exists.", { before: 150, after: 150 }));

children.push(heading("2. Hosting, access and collection boundaries"));
children.push(twoFieldTable([
  ["Data residency rule", blank, "Prohibited egress", blank],
  ["Allowed storage", blank, "Allowed model route", blank],
  ["Identity / SSO owner", blank, "Role groups", blank],
  ["Client boundaries", blank, "Engagement boundaries", blank],
  ["Restricted categories", blank, "Retention owner", blank],
  ["Approved transfer route", blank, "GitHub decision", blank]
]));
children.push(para("Client action: confirm which data may enter the small private GitHub pilot, which remains metadata-only, which requires a separate UAE-controlled transfer path, and who approves each route. A private repository does not by itself establish UAE residency.", { before: 150, after: 120 }));

children.push(new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [text("3. Eighteen-source register")] }));
children.push(para("Complete every category. For an absent or excluded source, record the decision and a named owner. The suggested lead, examples and location are starting points from the reference, not claims that Ethikcorp has supplied or connected the source.", { after: 170 }));
sources.forEach((source, index) => {
  if (index > 0 && index % 2 === 0) children.push(new Paragraph({ children: [new docx.PageBreak()] }));
  children.push(heading(`${String(index + 1).padStart(2, "0")}  ${source.title}`, 2));
  children.push(info("SUGGESTED LEAD", source.owner));
  children.push(info("FIND IT", `${source.examples}. Usually: ${source.usualLocation}. ${source.find}`));
  children.push(twoFieldTable([
    ["Named owner", blank, "System / exact URL", blank],
    ["Decision", "[In scope / context / excluded]", "Current version", blank],
    ["Audience / ACL", blank, "Sensitivity", blank],
    ["Format / language", blank, "Refresh cadence", blank],
    ["Rights / consent", blank, "Approval reference", blank]
  ]));
  children.push(para("Owner notes, duplicates, superseded copies or exclusion reason: [Client to complete]", { before: 80, after: 170, run: { size: 18, color: MUTED } }));
});

children.push(new Paragraph({ children: [new docx.PageBreak()] }));
children.push(heading("4. Authority and access decisions"));
children.push(para("Identify the system of record for each included source. Mark drafts and superseded versions. Specify any records that must be isolated by department, client or engagement before retrieval. Public-facing material can still require owner approval for accuracy and rights."));
children.push(twoFieldTable([
  ["Authority reviewer", blank, "Access reviewer", blank],
  ["Version rule", blank, "Deletion owner", blank],
  ["HR / payroll", "[Exclude or separately approve]", "Finance / legal", "[Separate scope]"],
  ["Client material", "[Engagement-specific]", "Chat / email", "[Curated decisions only]" ]
]));

children.push(heading("5. Client handoff checklist"));
for (const item of [
  "Executive sponsor, project owner and departmental source leads are named.",
  "All 18 categories have an actual owner and a location or an explicit absence/exclusion decision.",
  "Current authoritative versions, drafts, duplicates and superseded copies are marked.",
  "Audience, department, client and engagement access boundaries are recorded.",
  "Sensitivity, rights, consent, retention and residency restrictions are reviewed.",
  "Approved collection route and reviewer are recorded for each in-scope source.",
  "No credentials or sensitive source files are attached to this template.",
  "Sponsor, privacy/security and source owners approve the register before collection."
]) children.push(para(`[  ]  ${item}`, { after: 80 }));
children.push(twoFieldTable([
  ["Sponsor sign-off", blank, "Date", blank],
  ["Privacy/security", blank, "Date", blank],
  ["Source register ID", blank, "Next review date", blank]
]));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20, color: INK }, paragraph: { spacing: { after: 100 } } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: "Arial", size: 42, bold: true, color: INK }, paragraph: { spacing: { before: 140, after: 160 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Arial", size: 27, bold: true, color: INK }, paragraph: { spacing: { before: 250, after: 110 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Arial", size: 22, bold: true, color: TEAL }, paragraph: { spacing: { before: 220, after: 80 }, outlineLevel: 1 } }
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 780, bottom: 800, left: 890, right: 890 } } },
    headers: { default: new Header({ children: [para("AQIONCLOUD  /  ETHIKCORP                                       DISCOVERY & INVENTORY", { run: { color: TEAL, size: 15, bold: true } })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ children: [text("Client working template  |  17 October 2026  |  Page ", { size: 15, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: MUTED })] })] }) },
    children
  }]
});

const output = path.join(root, "output/docx/ethikcorp-discovery-inventory-template.docx");
fs.mkdirSync(path.dirname(output), { recursive: true });
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(output, buffer);
  const publicDir = path.join(root, "web/public/templates");
  fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(output, path.join(publicDir, path.basename(output)));
  console.log(output);
}).catch((error) => { console.error(error); process.exitCode = 1; });
