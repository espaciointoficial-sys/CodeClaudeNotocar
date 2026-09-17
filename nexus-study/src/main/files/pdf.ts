import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// ponytail: tope defensivo para no guardar cantidades desmedidas de texto de un PDF atípico
// (miles de páginas). Sigue siendo más que suficiente para buscar dentro del contenido.
const MAX_INDEXED_TEXT_LENGTH = 2_000_000;

// createRequire (en vez de import.meta.resolve) porque este módulo debe funcionar tanto en
// ejecución ESM directa (pruebas) como dentro del bundle CJS que genera electron-vite.
const localRequire = createRequire(import.meta.url);
const standardFontDataUrl = pathToFileURL(
  localRequire.resolve('pdfjs-dist/standard_fonts/FoxitFixed.pfb').replace(/FoxitFixed\.pfb$/, ''),
).toString();

export interface PdfExtractResult {
  pageCount: number | null;
  contentText: string | null;
}

/**
 * Extrae el número de páginas y el texto de un PDF en una sola pasada.
 * Si el archivo está dañado o no se puede leer, devuelve valores null en vez de fallar la importación.
 */
export async function extractPdfInfo(absolutePath: string): Promise<PdfExtractResult> {
  try {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(readFileSync(absolutePath));
    const loadingTask = getDocument({ data, standardFontDataUrl });
    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pageCount; i += 1) {
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pageTexts.push(
          content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' '),
        );
      } catch {
        // Una página dañada no debe impedir indexar el resto del documento.
      }
    }

    await loadingTask.destroy();
    const contentText = pageTexts.join('\n').trim().slice(0, MAX_INDEXED_TEXT_LENGTH) || null;
    return { pageCount, contentText };
  } catch {
    return { pageCount: null, contentText: null };
  }
}
