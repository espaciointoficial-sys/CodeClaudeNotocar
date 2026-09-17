import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from '../db/testDb.ts';
import { SubjectsRepository } from './subjects.repo.ts';
import { TasksRepository } from './tasks.repo.ts';

function setup() {
  const db = createTestDatabase();
  const subjects = new SubjectsRepository(db);
  const subject = subjects.create({ name: 'Cálculo', color: '#16A085' });
  const tasks = new TasksRepository(db);
  return { tasks, subject };
}

test('completar una tarea registra la fecha de finalización', () => {
  const { tasks, subject } = setup();
  const task = tasks.create({ subjectId: subject.id, title: 'Hacer ejercicios' });
  const completed = tasks.setCompleted(task.id, true);
  assert.equal(completed.status, 'completed');
  assert.ok(completed.completedAt);

  const reopened = tasks.setCompleted(task.id, false);
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.completedAt, null);
});

test('filtra tareas vencidas y próximas correctamente', () => {
  const { tasks, subject } = setup();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const inThreeWeeks = new Date(Date.now() + 21 * 86_400_000).toISOString();

  const overdueTask = tasks.create({ subjectId: subject.id, title: 'Vencida', dueDate: yesterday });
  const upcomingTask = tasks.create({ subjectId: subject.id, title: 'Próxima', dueDate: inThreeDays });
  tasks.create({ subjectId: subject.id, title: 'Lejana', dueDate: inThreeWeeks });

  const overdue = tasks.listBySubject(subject.id, { status: 'overdue' });
  assert.equal(overdue.length, 1);
  assert.equal(overdue[0]?.id, overdueTask.id);

  const upcoming = tasks.listBySubject(subject.id, { status: 'upcoming' });
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0]?.id, upcomingTask.id);
});
