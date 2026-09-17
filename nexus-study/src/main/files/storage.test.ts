import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importFileToStorage, getDocumentsDir, deleteDocumentFile } from './storage.ts';
import { ValidationError } from '../lib/util.ts';

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-study-test-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('rechaza extensiones no admitidas', () => {
  withTempDir((dir) => {
    const sourcePath = join(dir, 'malware.exe');
    writeFileSync(sourcePath, 'contenido');
    const documentsDir = getDocumentsDir(dir);
    assert.throws(() => importFileToStorage(sourcePath, documentsDir, 'doc-1'), ValidationError);
  });
});

test('copia un PDF válido con un nombre interno único basado en el id', () => {
  withTempDir((dir) => {
    const sourcePath = join(dir, 'apuntes.pdf');
    writeFileSync(sourcePath, '%PDF-1.4 contenido de prueba');
    const documentsDir = getDocumentsDir(dir);
    const copied = importFileToStorage(sourcePath, documentsDir, 'doc-123');
    assert.equal(copied.internalPath, 'doc-123.pdf');
    assert.equal(copied.originalName, 'apuntes.pdf');
    assert.ok(existsSync(join(documentsDir, 'doc-123.pdf')));
  });
});

test('dos archivos con el mismo nombre original no se sobrescriben', () => {
  withTempDir((dir) => {
    const documentsDir = getDocumentsDir(dir);
    const source1 = join(dir, 'a', 'notas.pdf');
    const source2 = join(dir, 'b', 'notas.pdf');
    mkdirSync(join(dir, 'a'), { recursive: true });
    mkdirSync(join(dir, 'b'), { recursive: true });
    writeFileSync(source1, 'primero');
    writeFileSync(source2, 'segundo');

    const copied1 = importFileToStorage(source1, documentsDir, 'doc-a');
    const copied2 = importFileToStorage(source2, documentsDir, 'doc-b');

    assert.notEqual(copied1.internalPath, copied2.internalPath);
    assert.ok(existsSync(join(documentsDir, copied1.internalPath)));
    assert.ok(existsSync(join(documentsDir, copied2.internalPath)));
  });
});

test('deleteDocumentFile no falla si el archivo ya no existe', () => {
  withTempDir((dir) => {
    const documentsDir = getDocumentsDir(dir);
    assert.doesNotThrow(() => deleteDocumentFile(documentsDir, 'inexistente.pdf'));
  });
});
