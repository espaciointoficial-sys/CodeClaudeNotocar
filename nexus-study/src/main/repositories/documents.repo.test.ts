import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from '../db/testDb.ts';
import { SubjectsRepository } from './subjects.repo.ts';
import { DocumentsRepository } from './documents.repo.ts';

function setupSubject() {
  const db = createTestDatabase();
  const subjects = new SubjectsRepository(db);
  const subject = subjects.create({ name: 'Programación', color: '#4F46E5' });
  return { db, subject };
}

test('crea un documento y lo recupera con etiquetas', () => {
  const { db, subject } = setupSubject();
  const documents = new DocumentsRepository(db);
  const doc = documents.create({
    subjectId: subject.id,
    title: 'Apuntes tema 1',
    originalName: 'tema1.pdf',
    internalPath: 'abc.pdf',
    fileType: 'pdf',
    sizeBytes: 1024,
    pageCount: 5,
    tags: ['importante', 'examen'],
  });
  const fetched = documents.get(doc.id);
  assert.ok(fetched);
  assert.deepEqual(fetched?.tags, ['importante', 'examen']);
  assert.equal(fetched?.isFavorite, false);
  assert.equal(fetched?.openCount, 0);
});

test('registerOpen incrementa el contador y actualiza la fecha', () => {
  const { db, subject } = setupSubject();
  const documents = new DocumentsRepository(db);
  const doc = documents.create({
    subjectId: subject.id,
    title: 'Apuntes',
    originalName: 'a.png',
    internalPath: 'x.png',
    fileType: 'png',
    sizeBytes: 10,
    pageCount: null,
  });
  const opened = documents.registerOpen(doc.id);
  assert.equal(opened.openCount, 1);
  assert.ok(opened.lastOpenedAt);
  const openedAgain = documents.registerOpen(doc.id);
  assert.equal(openedAgain.openCount, 2);
});

test('filtra documentos por favoritos y búsqueda', () => {
  const { db, subject } = setupSubject();
  const documents = new DocumentsRepository(db);
  const doc1 = documents.create({
    subjectId: subject.id,
    title: 'Resumen de grafos',
    originalName: 'grafos.pdf',
    internalPath: 'g.pdf',
    fileType: 'pdf',
    sizeBytes: 10,
    pageCount: 3,
  });
  documents.create({
    subjectId: subject.id,
    title: 'Diapositivas de recursividad',
    originalName: 'recursividad.pdf',
    internalPath: 'r.pdf',
    fileType: 'pdf',
    sizeBytes: 10,
    pageCount: 3,
  });
  documents.update(doc1.id, { isFavorite: true });

  const favorites = documents.listBySubject(subject.id, { favoritesOnly: true });
  assert.equal(favorites.length, 1);
  assert.equal(favorites[0]?.id, doc1.id);

  const searched = documents.listBySubject(subject.id, { search: 'grafos' });
  assert.equal(searched.length, 1);
});

test('la búsqueda encuentra coincidencias dentro del texto extraído del PDF', () => {
  const { db, subject } = setupSubject();
  const documents = new DocumentsRepository(db);
  const doc = documents.create({
    subjectId: subject.id,
    title: 'Tema 4',
    originalName: 'tema4.pdf',
    internalPath: 't4.pdf',
    fileType: 'pdf',
    sizeBytes: 10,
    pageCount: 5,
    contentText: 'La ecuación de Schrödinger describe la evolución temporal de un sistema cuántico.',
  });

  const found = documents.listBySubject(subject.id, { search: 'Schrödinger' });
  assert.equal(found.length, 1);
  assert.equal(found[0]?.id, doc.id);

  const withoutMatch = documents.listBySubject(subject.id, { search: 'termodinámica' });
  assert.equal(withoutMatch.length, 0);

  // El texto del contenido nunca debe filtrarse hacia el objeto que se envía al renderer.
  assert.equal((found[0] as unknown as { contentText?: string }).contentText, undefined);
});

test('mover un documento a otro tema (o a null) funciona', () => {
  const { db, subject } = setupSubject();
  const documents = new DocumentsRepository(db);
  const doc = documents.create({
    subjectId: subject.id,
    title: 'Apuntes',
    originalName: 'a.png',
    internalPath: 'x.png',
    fileType: 'png',
    sizeBytes: 10,
    pageCount: null,
  });
  const moved = documents.move(doc.id, null);
  assert.equal(moved.folderId, null);
});
