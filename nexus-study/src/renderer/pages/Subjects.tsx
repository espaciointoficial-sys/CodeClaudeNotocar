import { useEffect, useMemo, useState } from 'react';
import type { Subject, SubjectInput, SubjectWithStats } from '@shared/types';
import type { View } from '../App';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Spinner } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SubjectForm } from '../components/subjects/SubjectForm';
import { SubjectCard } from '../components/subjects/SubjectCard';
import { useToast } from '../contexts/ToastContext';
import styles from './Subjects.module.css';

type SortKey = 'name' | 'lastAccessedAt' | 'createdAt' | 'position';
type StatusFilter = 'active' | 'archived' | 'all';

export function Subjects({
  onNavigate,
  openCreateToken,
}: {
  onNavigate: (view: View) => void;
  openCreateToken?: number;
}) {
  const [subjects, setSubjects] = useState<SubjectWithStats[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [formTarget, setFormTarget] = useState<Subject | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubjectWithStats | null>(null);
  const { showToast } = useToast();

  const reload = () => window.api.subjects.list(true).then(setSubjects);

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    // Reacciona a una señal externa (atajo de teclado global), no a un valor derivado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openCreateToken) setFormTarget('new');
  }, [openCreateToken]);

  const filtered = useMemo(() => {
    if (!subjects) return [];
    let list = subjects;
    if (statusFilter !== 'all') list = list.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.professor?.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (sortKey) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'lastAccessedAt':
        sorted.sort((a, b) => (b.lastAccessedAt ?? '').localeCompare(a.lastAccessedAt ?? ''));
        break;
      case 'createdAt':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'position':
      default:
        sorted.sort((a, b) => a.position - b.position);
    }
    return sorted;
  }, [subjects, search, statusFilter, sortKey]);

  const handleCreate = async (input: SubjectInput) => {
    await window.api.subjects.create(input);
    setFormTarget(null);
    showToast('Asignatura creada.', 'success');
    reload();
  };

  const handleEdit = async (input: SubjectInput) => {
    if (!formTarget || formTarget === 'new') return;
    await window.api.subjects.update(formTarget.id, input);
    setFormTarget(null);
    showToast('Asignatura actualizada.', 'success');
    reload();
  };

  const handleArchiveToggle = async (subject: SubjectWithStats) => {
    await window.api.subjects.setArchived(subject.id, subject.status === 'active');
    showToast(subject.status === 'active' ? 'Asignatura archivada.' : 'Asignatura reactivada.', 'success');
    reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await window.api.subjects.remove(deleteTarget.id);
    setDeleteTarget(null);
    showToast('Asignatura eliminada.', 'success');
    reload();
  };

  const openSubject = (subject: SubjectWithStats) => {
    void window.api.subjects.touchAccessed(subject.id);
    onNavigate({ name: 'subjectDetail', subjectId: subject.id });
  };

  return (
    <div>
      <PageHeader
        title="Asignaturas"
        description="Organiza tus materias y accede a sus apuntes, tareas y calendario."
        actions={<Button variant="primary" onClick={() => setFormTarget('new')}>+ Nueva asignatura</Button>}
      />

      <div className="page-body">
        <div className={styles.toolbar}>
          <input
            className="input"
            placeholder="Buscar por nombre o profesor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="active">Activas</option>
            <option value="archived">Archivadas</option>
            <option value="all">Todas</option>
          </select>
          <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="position">Orden manual</option>
            <option value="name">Nombre</option>
            <option value="lastAccessedAt">Última apertura</option>
            <option value="createdAt">Creación</option>
          </select>
          <div className={styles.layoutToggle}>
            <button data-active={layout === 'grid'} onClick={() => setLayout('grid')} aria-label="Vista de tarjetas" data-tooltip="Vista de tarjetas">
              <Icon name="grid" size={16} />
            </button>
            <button data-active={layout === 'list'} onClick={() => setLayout('list')} aria-label="Vista de lista" data-tooltip="Vista de lista">
              <Icon name="list" size={16} />
            </button>
          </div>
        </div>

        {!subjects ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          subjects.length === 0 ? (
            <EmptyState
              icon="book"
              title="Todavía no tienes asignaturas"
              description="Crea tu primera asignatura para empezar a guardar apuntes, tareas y fechas importantes."
              action={<Button variant="primary" onClick={() => setFormTarget('new')}>Crear asignatura</Button>}
            />
          ) : (
            <EmptyState icon="search" title="Sin resultados" description="Prueba a cambiar la búsqueda o los filtros." />
          )
        ) : (
          <div className={layout === 'grid' ? styles.grid : styles.list}>
            {filtered.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                layout={layout}
                onOpen={() => openSubject(subject)}
                onEdit={() => setFormTarget(subject)}
                onArchiveToggle={() => handleArchiveToggle(subject)}
                onDelete={() => setDeleteTarget(subject)}
              />
            ))}
          </div>
        )}
      </div>

      {formTarget === 'new' && <SubjectForm onSubmit={handleCreate} onClose={() => setFormTarget(null)} />}
      {formTarget && formTarget !== 'new' && (
        <SubjectForm subject={formTarget} onSubmit={handleEdit} onClose={() => setFormTarget(null)} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar asignatura"
          message={`Se eliminará "${deleteTarget.name}" junto con sus temas, apuntes, notas, tareas y eventos. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
