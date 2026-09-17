import { useEffect, useState, type CSSProperties } from 'react';
import type { Subject, SubjectInput, StudySession } from '@shared/types';
import type { View, SubjectTab } from '../../App';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Spinner';
import { Icon } from '../../components/ui/Icon';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { SubjectForm } from '../../components/subjects/SubjectForm';
import { useToast } from '../../contexts/ToastContext';
import { usePomodoro } from '../../contexts/PomodoroContext';
import { formatDuration, pluralize } from '../../lib/format';
import { DocumentsTab } from './DocumentsTab';
import { NotesTab } from './NotesTab';
import { TasksTab } from './TasksTab';
import { CalendarTab } from './CalendarTab';
import { ProgressTab } from './ProgressTab';
import styles from './SubjectDetail.module.css';

const TABS: { key: SubjectTab; label: string }[] = [
  { key: 'documents', label: 'Apuntes' },
  { key: 'notes', label: 'Notas' },
  { key: 'tasks', label: 'Tareas' },
  { key: 'calendar', label: 'Calendario' },
  { key: 'progress', label: 'Progreso' },
];

interface SubjectDetailProps {
  subjectId: string;
  initialTab?: SubjectTab;
  onNavigate: (view: View) => void;
}

export function SubjectDetail({ subjectId, initialTab, onNavigate }: SubjectDetailProps) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [studySeconds, setStudySeconds] = useState(0);
  const [tab, setTab] = useState<SubjectTab>(initialTab ?? 'documents');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const pomodoro = usePomodoro();

  const reloadHeader = () => {
    window.api.subjects.get(subjectId).then((s) => setSubject(s));
    window.api.documents.listBySubject(subjectId).then((docs) => setDocumentCount(docs.length));
    window.api.tasks.listBySubject(subjectId, { status: 'pending' }).then((tasks) => setPendingTaskCount(tasks.length));
    window.api.studySessions.listBySubject(subjectId).then((sessions: StudySession[]) =>
      setStudySeconds(sessions.reduce((sum, s) => sum + s.durationSeconds, 0)),
    );
  };

  useEffect(() => {
    void window.api.subjects.touchAccessed(subjectId);
    reloadHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  if (!subject) return <Spinner label="Cargando asignatura…" />;

  const handleEdit = async (input: SubjectInput) => {
    await window.api.subjects.update(subject.id, input);
    setEditing(false);
    showToast('Asignatura actualizada.', 'success');
    reloadHeader();
  };

  const handleArchive = async () => {
    await window.api.subjects.setArchived(subject.id, subject.status === 'active');
    showToast(subject.status === 'active' ? 'Asignatura archivada.' : 'Asignatura reactivada.', 'success');
    reloadHeader();
  };

  const handleDelete = async () => {
    await window.api.subjects.remove(subject.id);
    onNavigate({ name: 'subjects' });
  };

  const startStudySession = () => {
    pomodoro.setSelection(subject.id, null);
    pomodoro.start();
    showToast('Sesión Pomodoro iniciada para esta asignatura.', 'success');
  };

  return (
    <div>
      <div className={styles.header} style={{ '--subject-color': subject.color } as CSSProperties}>
        <div className={styles.headerInner}>
          <button className={styles.back} onClick={() => onNavigate({ name: 'subjects' })}>
            <Icon name="chevron-left" size={14} />
            Asignaturas
          </button>
          <div className={styles.headRow}>
            <div className={styles.iconBadge}>{subject.icon ?? subject.name.charAt(0).toUpperCase()}</div>
            <div className={styles.titleBlock}>
              <h1>{subject.name}</h1>
              <p>{[subject.professor, subject.term].filter(Boolean).join(' · ') || 'Sin detalles adicionales'}</p>
            </div>
            <div className={styles.headActions}>
              <DropdownMenu
                actions={[
                  { label: 'Editar', onSelect: () => setEditing(true) },
                  { label: subject.status === 'active' ? 'Archivar' : 'Reactivar', onSelect: handleArchive },
                  { label: 'Eliminar', danger: true, onSelect: () => setDeleting(true) },
                ]}
              />
            </div>
          </div>

          <div className={styles.stats}>
            <span>
              {documentCount} {pluralize(documentCount, 'apunte', 'apuntes')}
            </span>
            <span>
              {pendingTaskCount} {pluralize(pendingTaskCount, 'tarea pendiente', 'tareas pendientes')}
            </span>
            <span>{formatDuration(studySeconds)} estudiadas</span>
          </div>

          <div className={styles.quickActions}>
            <Button size="sm" variant="primary" onClick={startStudySession}>
              <Icon name="play" size={13} filled />
              Iniciar sesión de estudio
            </Button>
            <Button size="sm" onClick={() => setTab('documents')}>
              Subir apunte
            </Button>
            <Button size="sm" onClick={() => setTab('notes')}>
              Nueva nota
            </Button>
            <Button size="sm" onClick={() => setTab('tasks')}>
              Nueva tarea
            </Button>
          </div>

          <div className={styles.tabs} role="tablist">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} data-active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body">
        {tab === 'documents' && <DocumentsTab subjectId={subject.id} onChanged={reloadHeader} />}
        {tab === 'notes' && <NotesTab subjectId={subject.id} />}
        {tab === 'tasks' && <TasksTab subjectId={subject.id} onChanged={reloadHeader} />}
        {tab === 'calendar' && <CalendarTab subjectId={subject.id} />}
        {tab === 'progress' && <ProgressTab subjectId={subject.id} />}
      </div>

      {editing && <SubjectForm subject={subject} onSubmit={handleEdit} onClose={() => setEditing(false)} />}
      {deleting && (
        <ConfirmDialog
          title="Eliminar asignatura"
          message={`Se eliminará "${subject.name}" junto con sus temas, apuntes, notas, tareas y eventos. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
