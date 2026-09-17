import { useEffect, useState } from 'react';
import type { StudyTask, TaskInput } from '@shared/types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TaskForm } from '../../components/tasks/TaskForm';
import { TaskListItem } from '../../components/tasks/TaskListItem';
import { useToast } from '../../contexts/ToastContext';
import styles from './TasksTab.module.css';

type Filter = 'all' | 'pending' | 'completed' | 'overdue' | 'upcoming';

export function TasksTab({ subjectId, onChanged }: { subjectId: string; onChanged: () => void }) {
  const [tasks, setTasks] = useState<StudyTask[] | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [formTarget, setFormTarget] = useState<StudyTask | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = () =>
    window.api.tasks.listBySubject(subjectId, { status: filter === 'all' ? undefined : filter }).then(setTasks);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, filter]);

  const handleCreate = async (input: TaskInput) => {
    await window.api.tasks.create(input);
    setFormTarget(null);
    showToast('Tarea creada.', 'success');
    load();
    onChanged();
  };

  const handleEdit = async (input: TaskInput) => {
    if (!formTarget || formTarget === 'new') return;
    await window.api.tasks.update(formTarget.id, input);
    setFormTarget(null);
    showToast('Tarea actualizada.', 'success');
    load();
  };

  const handleToggle = async (task: StudyTask) => {
    await window.api.tasks.setCompleted(task.id, task.status !== 'completed');
    load();
    onChanged();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await window.api.tasks.remove(deletingId);
    setDeletingId(null);
    load();
    onChanged();
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {(['pending', 'all', 'completed', 'overdue', 'upcoming'] as Filter[]).map((f) => (
            <button key={f} data-active={filter === f} onClick={() => setFilter(f)}>
              {{ all: 'Todas', pending: 'Pendientes', completed: 'Completadas', overdue: 'Vencidas', upcoming: 'Próximas' }[f]}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => setFormTarget('new')}>
          + Nueva tarea
        </Button>
      </div>

      {!tasks ? null : tasks.length === 0 ? (
        <EmptyState icon="check-circle" title="No hay tareas en este filtro" action={<Button onClick={() => setFormTarget('new')}>Crear tarea</Button>} />
      ) : (
        <div className={styles.list}>
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              onToggleComplete={() => handleToggle(task)}
              onEdit={() => setFormTarget(task)}
              onDelete={() => setDeletingId(task.id)}
            />
          ))}
        </div>
      )}

      {formTarget === 'new' && <TaskForm subjectId={subjectId} onSubmit={handleCreate} onClose={() => setFormTarget(null)} />}
      {formTarget && formTarget !== 'new' && (
        <TaskForm subjectId={subjectId} task={formTarget} onSubmit={handleEdit} onClose={() => setFormTarget(null)} />
      )}
      {deletingId && (
        <ConfirmDialog
          title="Eliminar tarea"
          message="Esta tarea se eliminará de forma permanente."
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
