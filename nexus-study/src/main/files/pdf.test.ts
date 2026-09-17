import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractPdfInfo } from './pdf.ts';

/** Genera un PDF válido de una página con un texto conocido, calculando los offsets del xref. */
function buildMinimalPdf(text: string): string {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${text.length + 40} >>\nstream\nBT /F1 18 Tf 20 100 Td (${text}) Tj ET\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${offsets[i]!.toString().padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

test('extrae número de páginas y texto de un PDF válido', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-study-pdf-'));
  try {
    const path = join(dir, 'apunte.pdf');
    writeFileSync(path, buildMinimalPdf('Hola mundo'));
    const result = await extractPdfInfo(path);
    assert.equal(result.pageCount, 1);
    assert.ok(result.contentText?.includes('Hola mundo'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('un archivo que no es un PDF real no lanza excepción, solo devuelve null', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-study-pdf-'));
  try {
    const path = join(dir, 'roto.pdf');
    writeFileSync(path, 'esto no es un pdf en absoluto');
    const result = await extractPdfInfo(path);
    assert.equal(result.pageCount, null);
    assert.equal(result.contentText, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
