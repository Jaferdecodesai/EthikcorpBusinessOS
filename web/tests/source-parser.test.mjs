import test from "node:test";
import assert from "node:assert/strict";
import { extractWorkerSource } from "../cloudflare/team-source-parser.mjs";
import { extractSourceFile } from "../server/source-parser.mjs";
import { zipStore } from "../phase1/xlsx.mjs";
import { emptyBrain, ingestDocument, prepareDocument, rankChunks } from "../server/brain-pipeline.mjs";
import { askRelease, deployCandidate, evaluateCandidate } from "../server/brain-release.mjs";

test("a text-based PDF retains the original file name and page citation", async () => {
  const pdf = await extractSourceFile("pdf", textPdf("Synthetic invoice approval procedure"));
  assert.deepEqual([pdf.pages, pdf.textPages], [1, 1]);
  const workerPdf = await extractWorkerSource("pdf", textPdf("Synthetic invoice approval procedure"));
  assert.deepEqual(workerPdf, pdf);
  assert.match(pdf.text, /^# Page 1\n\nSynthetic invoice approval procedure/);
  const { brain } = ingestDocument(emptyBrain(), { name: "procedure.pdf", text: pdf.text, extractedFormat: pdf.format });
  assert.equal(brain.chunks[0].heading, "Page 1");
  assert.equal(brain.chunks[0].document, "procedure.pdf");
  await assert.rejects(extractSourceFile("pdf", textPdf("")), /No readable text/);
});

test("private intake keeps the end of a long paragraph and rejects excessive sections before upload", () => {
  const doc = prepareDocument({ name: "long.txt", text: `${"synthetic ".repeat(1000)}end marker`, extractedFormat: "text" });
  assert.ok(doc.ok);
  assert.ok(doc.rich.every((passage) => passage.text.length <= 700));
  assert.match(doc.rich.at(-1).text, /end marker$/);
  const excessive = prepareDocument({ name: "many.md", text: Array.from({ length: 161 }, (_, i) => `# Heading ${i}\nDetails`).join("\n\n"), extractedFormat: "markdown" });
  assert.equal(excessive.ok, false);
});

test("a Word source is extracted as plain text and can be retrieved in Arabic", async () => {
  const contentTypes = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const relationships = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const document = '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>يُراجِع فريق المبيعات طلبات الفواتير المُعتمدة.</w:t></w:r></w:p></w:body></w:document>';
  const files = { "[Content_Types].xml": contentTypes, "_rels/.rels": relationships, "word/document.xml": document };
  const bytes = Buffer.from(await zipStore(Object.entries(files).map(([name, xml]) => ({ name, data: Buffer.from(xml) }))));
  const word = await extractSourceFile("docx", bytes);
  assert.match(word.text, /المبيعات/);
  assert.deepEqual(await extractWorkerSource("docx", bytes), word);
  const seed = { ...emptyBrain(), ownershipReady: true, confirmed: { sales: true }, ownership: [{ sourceId: "sops" }] };
  const { brain } = ingestDocument(seed, {
    name: "approved-procedures.docx", text: word.text, extractedFormat: word.format, sourceId: "sops", audience: "sales",
    handoffId: "synthetic-word", sourceUrl: "https://github.com/example/private/approved-procedures.docx"
  });
  const evaluated = { ...brain, candidate: evaluateCandidate(brain) };
  const released = deployCandidate(evaluated);
  const answer = askRelease(released, { area: "bots", departmentId: "sales", question: "ما هي إجراءات الفواتير المعتمدة؟" });
  assert.equal(answer.citations[0].document, "approved-procedures.docx");
  assert.equal(rankChunks("الفواتير", [{ ...brain.chunks[0], embedding: Array(48).fill(0), embeddingVersion: undefined }])[0].score > 0, true);
});

function textPdf(text) {
  const stream = `BT /F1 14 Tf 50 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
