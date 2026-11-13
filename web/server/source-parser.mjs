import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";

const maxCharacters = 40000;
const maxPages = 80;

function checkedText(text) {
  if (text.trim().length > maxCharacters) throw new Error("The extracted text exceeds 40,000 characters. Split the document before uploading.");
  if (!/[\p{L}\p{N}]/u.test(text)) throw new Error("No readable text was found. Export a text-based document or run OCR before uploading.");
  return text;
}

async function fromPdf(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const packageRoot = import.meta.resolve("pdfjs-dist/package.json");
  const task = getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    useWorkerFetch: false,
    standardFontDataUrl: fileURLToPath(new URL("standard_fonts/", packageRoot)),
    cMapUrl: fileURLToPath(new URL("cmaps/", packageRoot)),
    cMapPacked: true
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > maxPages) throw new Error("PDFs may contain up to 80 pages. Split the file before uploading.");
    const pages = [];
    let size = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const { items } = await page.getTextContent();
      const text = items.filter((item) => typeof item.str === "string").map(({ str, hasEOL }) => str + (hasEOL ? "\n" : " ")).join("").trim();
      page.cleanup();
      if (/[\p{L}\p{N}]/u.test(text)) {
        const section = `# Page ${number}\n\n${text}`;
        size += section.length + 2;
        if (size > maxCharacters) throw new Error("The extracted text exceeds 40,000 characters. Split the document before uploading.");
        pages.push(section);
      }
    }
    return { text: checkedText(pages.join("\n\n")), format: "markdown", pages: pdf.numPages, textPages: pages.length };
  } finally {
    await task.destroy();
  }
}

async function fromDocx(bytes) {
  const { default: mammoth } = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) }, { externalFileAccess: false });
  return { text: checkedText(value), format: "text" };
}

export async function extractSourceFile(extension, bytes) {
  if (extension === "md" || extension === "txt") {
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { throw new Error("The source file is not valid UTF-8."); }
    return { text: checkedText(text), format: extension === "md" ? "markdown" : "text" };
  }
  if (extension !== "pdf" && extension !== "docx") throw new Error("Collection accepts Markdown, text, PDF, or Word documents.");
  if (extension === "pdf" && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("The selected file is not a PDF.");
  if (extension === "pdf" && !globalThis.process.getBuiltinModule) throw new Error("PDF extraction requires Node.js 22.13 or newer.");
  if (extension === "docx" && !bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) throw new Error("The selected file is not a Word document.");
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { extension, bytes },
    execArgv: [],
    env: {},
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32 }
  });
  let timer;
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Source extraction timed out. Split the document or export it as text.")), 12000);
      worker.once("message", (result) => result.error ? reject(new Error(result.error)) : resolve(result));
      worker.once("error", () => reject(new Error("Source extraction failed. Try exporting the file as text.")));
      worker.once("exit", () => reject(new Error("Source extraction ended before returning text.")));
    });
  } finally {
    clearTimeout(timer);
    await worker.terminate();
  }
}

if (!isMainThread && workerData) {
  try {
    const parse = workerData.extension === "pdf" ? fromPdf : fromDocx;
    parentPort.postMessage(await parse(workerData.bytes));
  } catch (error) {
    const message = /40,000 characters|80 pages|No readable text/.test(error.message) ? error.message : "The document could not be read. Check for password protection or export it as text.";
    parentPort.postMessage({ error: message });
  }
}
