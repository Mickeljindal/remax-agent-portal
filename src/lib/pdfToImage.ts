// Renders the first page of a PDF file to a PNG data URL using pdfjs-dist.
// The worker is loaded from the same versioned package via a bundled URL.
import * as pdfjsLib from "pdfjs-dist";
// Vite resolves this to a hashed asset URL at build time.
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function pdfFirstPageToDataUrl(file: File, scale = 2): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}
