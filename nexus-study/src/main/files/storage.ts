import { existsSync, mkdirSync, copyFileSync, statSync, unlinkSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import { ALLOWED_DOCUMENT_EXTENSIONS, type DocumentFileType } from '../../shared/types.ts';
import { ValidationError } from '../lib/util.ts';

export const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

export function getDocumentsDir(userDataDir: string): string {
  const dir = join(userDataDir, 'documents');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function detectFileType(filePath: string): DocumentFileType {
  const ext = extname(filePath).slice(1).toLowerCase();
  if (!(ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new ValidationError(
      `Tipo de archivo no admitido (.${ext || '?'}). Solo se aceptan PDF, JPG, JPEG, PNG y WEBP.`,
    );
  }
  return ext as DocumentFileType;
}

export interface CopiedFile {
  internalPath: string;
  originalName: string;
  fileType: DocumentFileType;
  sizeBytes: number;
}

/** Valida y copia un archivo externo al almacén interno de la app con un nombre único (documentId). */
export function importFileToStorage(sourcePath: string, documentsDir: string, documentId: string): CopiedFile {
  if (!existsSync(sourcePath)) {
    throw new ValidationError(`El archivo ya no existe en la ruta original: ${sourcePath}`);
  }
  const fileType = detectFileType(sourcePath);
  const stats = statSync(sourcePath);
  if (!stats.isFile()) {
    throw new ValidationError('La ruta seleccionada no corresponde a un archivo.');
  }
  if (stats.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(
      `El archivo supera el tamaño máximo permitido (${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB).`,
    );
  }

  const internalPath = `${documentId}.${fileType}`;
  copyFileSync(sourcePath, join(documentsDir, internalPath));

  return {
    internalPath,
    originalName: basename(sourcePath),
    fileType,
    sizeBytes: stats.size,
  };
}

export function deleteDocumentFile(documentsDir: string, internalPath: string): void {
  const target = join(documentsDir, internalPath);
  try {
    if (existsSync(target)) unlinkSync(target);
  } catch {
    // Si el archivo ya no existe o no se puede borrar, no bloqueamos la eliminación del registro.
  }
}

export function resolveDocumentPath(documentsDir: string, internalPath: string): string {
  return join(documentsDir, internalPath);
}
