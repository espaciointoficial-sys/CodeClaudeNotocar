import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from '../db/testDb.ts';
import { SubjectsRepository } from './subjects.repo.ts';
import { FoldersRepository } from './folders.repo.ts';
import { ValidationError, NotFoundError } from '../lib/util.ts';

test('crea una asignatura con posición autoincremental', () => {
  const repo = new SubjectsRepository(createTestDatabase());
  const a = repo.create({ name: 'Programación', color: '#4F46E5' });
  const b = repo.create({ name: 'Cálculo', color: '#16A085' });
  assert.equal(a.position, 0);
  assert.equal(b.position, 1);
  assert.equal(a.status, 'active');
});

test('rechaza nombre vacío y color inválido', () => {
  const repo = new SubjectsRepository(createTestDatabase());
  assert.throws(() => repo.create({ name: '  ', color: '#000000' }), ValidationError);
  assert.throws(() => repo.create({ name: 'Física', color: 'rojo' }), ValidationError);
});

test('archivar cambia el estado sin borrar la asignatura', () => {
  const repo = new SubjectsRepository(createTestDatabase());
  const subject = repo.create({ name: 'Química', color: '#4F46E5' });
  const archived = repo.setArchived(subject.id, true);
  assert.equal(archived.status, 'archived');
  assert.equal(repo.listWithStats(false).length, 0);
  assert.equal(repo.listWithStats(true).length, 1);
});

test('eliminar una asignatura elimina en cascada sus temas', () => {
  const db = createTestDatabase();
  const subjects = new SubjectsRepository(db);
  const folders = new FoldersRepository(db);
  const subject = subjects.create({ name: 'Biología', color: '#16A085' });
  folders.create({ subjectId: subject.id, name: 'Genética' });
  subjects.remove(subject.id);
  assert.equal(folders.listBySubject(subject.id).length, 0);
});

test('operar sobre una asignatura inexistente lanza NotFoundError', () => {
  const repo = new SubjectsRepository(createTestDatabase());
  assert.throws(() => repo.update('no-existe', { name: 'X' }), NotFoundError);
  assert.throws(() => repo.remove('no-existe'), NotFoundError);
});
