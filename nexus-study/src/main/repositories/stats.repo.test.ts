import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from '../db/testDb.ts';
import { SubjectsRepository } from './subjects.repo.ts';
import { StudySessionsRepository } from './studySessions.repo.ts';
import { StatsRepository } from './stats.repo.ts';

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

test('una sesión de hoy se contabiliza en el día de hoy, según la hora local', () => {
  const db = createTestDatabase();
  const subjects = new SubjectsRepository(db);
  const sessions = new StudySessionsRepository(db);
  const subject = subjects.create({ name: 'Física', color: '#4F46E5' });

  const now = new Date();
  sessions.create({
    subjectId: subject.id,
    durationSeconds: 60,
    startedAt: new Date(now.getTime() - 1000).toISOString(),
    endedAt: now.toISOString(),
    type: 'pomodoro',
  });

  const stats = new StatsRepository(db);
  const summary = stats.summary('week');
  const todayKey = localDayKey(now);
  const todayBucket = summary.studyTimeByDay.find((d) => d.date === todayKey);

  assert.ok(todayBucket, `debería existir un bucket para hoy (${todayKey})`);
  assert.equal(todayBucket?.seconds, 60);
  assert.equal(summary.totalStudySeconds, 60);
  assert.equal(summary.currentStreakDays, 1);
});

test('sin sesiones registradas, la racha es cero y no hay NaN', () => {
  const db = createTestDatabase();
  const stats = new StatsRepository(db);
  const summary = stats.summary('week');

  assert.equal(summary.currentStreakDays, 0);
  assert.equal(summary.totalStudySeconds, 0);
  assert.ok(summary.studyTimeByDay.every((d) => Number.isFinite(d.seconds)));
});

test('una sesión de ayer produce una racha de dos días si hoy también se estudia', () => {
  const db = createTestDatabase();
  const subjects = new SubjectsRepository(db);
  const sessions = new StudySessionsRepository(db);
  const subject = subjects.create({ name: 'Química', color: '#16A085' });

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  sessions.create({
    subjectId: subject.id,
    durationSeconds: 30,
    startedAt: yesterday.toISOString(),
    endedAt: yesterday.toISOString(),
    type: 'review',
  });
  sessions.create({
    subjectId: subject.id,
    durationSeconds: 30,
    startedAt: now.toISOString(),
    endedAt: now.toISOString(),
    type: 'review',
  });

  const stats = new StatsRepository(db);
  assert.equal(stats.summary('week').currentStreakDays, 2);
});
