import { Buffer } from "node:buffer";
import { getDocumentProxy } from "unpdf";
import mammoth from "mammoth/mammoth.browser.js";

const maxCharacters = 40_000;
const hasText = (text) => /[\p{L}\p{N}]/u.test(text);

function checked(text, format) {
  if (text.trim().length > maxCharacters) throw new Error("The extracted text exceeds 40,000 characters. Split the document before uploading.");
  if (!hasText(text)) throw new Error("No readable text was found. Export a text-based document or run OCR before uploading.");
  return { text, format };
}

async function extractPdf(bytes) {
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("The selected file is not a PDF.");
  const pdf = await getDocumentProxy(Uint8Array.from(bytes), { isEvalSupported: false, useSystemFonts: false, disableFontFace: true });
  try {
    if (pdf.numPages > 80) throw new Error("PDFs may contain up to 80 pages. Split the file before uploading.");
    const pages = [];
    let length = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const { items } = await page.getTextContent();
      const text = items.filter((item) => typeof item.str === "string").map(({ str, hasEOL }) => str + (hasEOL ? "\n" : " ")).join("").trim();
      page.cleanup();
      if (!hasText(text)) continue;
      const section = `# Page ${pageNumber}\n\n${text}`;
      length += section.length + 2;
      if (length > maxCharacters) throw new Error("The extracted text exceeds 40,000 characters. Split the document before uploading.");
      pages.push(section);
    }
    return { ...checked(pages.join("\n\n"), "markdown"), pages: pdf.numPages, textPages: pages.length };
  } finally {
    await pdf.loadingTask.destroy();
  }
}

export async function extractWorkerSource(extension, bytes) {
  if (extension === "md" || extension === "txt") {
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { throw new Error("The source file is not valid UTF-8."); }
    return checked(text, extension === "md" ? "markdown" : "text");
  }
  if (extension === "pdf") return extractPdf(bytes);
  if (extension !== "docx") throw new Error("Collection accepts Markdown, text, PDF, or Word documents.");
  if (!bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) throw new Error("The selected file is not a Word document.");
  const { value } = await mammoth.extractRawText({ arrayBuffer: Uint8Array.from(bytes).buffer }, { externalFileAccess: false });
  return checked(value, "text");
}
