import { protocol, net } from 'electron';
import { pathToFileURL } from 'node:url';
import type { DocumentsRepository } from './repositories/documents.repo.ts';
import { resolveDocumentPath } from './files/storage.ts';

export const DOCUMENT_PROTOCOL = 'nexus-doc';

/** Debe llamarse antes de que la app esté lista: registra el esquema como seguro y apto para fetch(). */
export function registerDocumentProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: DOCUMENT_PROTOCOL,
      privileges: { secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
    },
  ]);
}

/**
 * Sirve el contenido de un documento al renderer sin exponer rutas reales del disco:
 * el renderer solo conoce IDs de documento (nexus-doc://<id>), y aquí se resuelven a archivo real.
 */
export function registerDocumentProtocolHandler(documentsRepo: DocumentsRepository, documentsDir: string): void {
  protocol.handle(DOCUMENT_PROTOCOL, async (request) => {
    const documentId = new URL(request.url).hostname;
    const doc = documentsRepo.get(documentId);
    if (!doc) return new Response('Documento no encontrado', { status: 404 });
    const absolutePath = resolveDocumentPath(documentsDir, doc.internalPath);
    try {
      return await net.fetch(pathToFileURL(absolutePath).toString(), { headers: request.headers });
    } catch {
      return new Response('No se pudo leer el archivo', { status: 500 });
    }
  });
}
