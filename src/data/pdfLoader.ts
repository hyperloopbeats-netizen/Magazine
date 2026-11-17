import * as pdfjsLib from 'pdfjs-dist';
import { SlideItem } from '../types/matrix';

// Configure PDF.js worker using Vite native module URL resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

export async function loadPdfAsSlides(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<SlideItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  const totalPages = Math.min(pdfDoc.numPages, 60);
  const cleanBaseName = file.name.replace(/\.pdf$/i, '');
  const slides: SlideItem[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);
    const page = await pdfDoc.getPage(pageNum);

    // High-clarity 1600px+ scale balanced for mobile/desktop GPU upload
    const baseViewport = page.getViewport({ scale: 1 });
    const targetScale = Math.min(2.2, Math.max(1.2, 1600 / Math.max(baseViewport.width, baseViewport.height)));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.floor(viewport.width));
    canvas.height = Math.max(2, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#faf9f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }

    // Extract text layer for Smart Memory Mesh & Smart Library Mode
    let extractedText = '';
    try {
      const textContent = await page.getTextContent();
      extractedText = textContent.items
        .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      extractedText = '';
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.9)
    );
    const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/webp', 0.9);

    slides.push({
      id: `pdf_${Date.now()}_${pageNum}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${cleanBaseName} — Page ${pageNum}`,
      subtitle: `PDF Folio · Page ${pageNum} of ${pdfDoc.numPages}`,
      url,
      source: 'pdf',
      aspectHint: canvas.width / canvas.height,
      createdAt: Date.now() + pageNum,
      pdfName: file.name,
      pageNumber: pageNum,
      totalPages: pdfDoc.numPages,
      extractedText,
    });

    page.cleanup();
  }

  return slides;
}
