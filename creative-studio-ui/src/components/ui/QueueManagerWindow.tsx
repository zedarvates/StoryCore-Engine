/**
 * Queue Manager Window — Full-featured generation queue management UI
 *
 * Features:
 * - Live statistics dashboard (pending, running, completed, failed)
 * - Drag-friendly priority controls (move up/down)
 * - Status filtering + auto-refresh toggle
 * - Retry & delete actions for terminal jobs
 * - Expandable task cards with full detail
 * - Glassmorphism design with smooth micro-animations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  TaskQueueItem,
  TaskQueueResponse,
  QueueStatsResponse,
} from '../../types';
import {
  getTaskQueue,
  moveJobUp,
  moveJobDown,
  retryJob,
  deleteJob,
  getQueueStats,
  getStatusColor,
  formatEstimatedTime,
  getStatusIcon,
  getPriorityIcon,
} from '../../services/taskQueueService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QueueManagerWindowProps {
  projectId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function QueueManagerWindow({
  projectId,
  isOpen = true,
  onClose,
}: QueueManagerWindowProps) {
  const [tasks, setTasks] = useState<TaskQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setActionError(null);
      const [queueRes, statsRes]: [TaskQueueResponse, QueueStatsResponse] =
        await Promise.all([
          getTaskQueue(projectId, filter === 'all' ? undefined : filter),
          getQueueStats(projectId),
        ]);
      setTasks(queueRes.tasks);
      setStats(statsRes);
      setLastRefreshed(new Date());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }, [projectId, filter]);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      timerRef.current = setInterval(fetchData, refreshInterval * 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, autoRefresh, refreshInterval]);

  // ── Action handlers ────────────────────────────────────────────────────────

  const withBusy = async (jobId: string, fn: () => Promise<void>) => {
    setBusyId(jobId);
    setActionError(null);
    try {
      await fn();
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveUp = (id: string) =>
    withBusy(id, async () => { await moveJobUp(id); });
  const handleMoveDown = (id: string) =>
    withBusy(id, async () => { await moveJobDown(id); });
  const handleRetry = (id: string) =>
    withBusy(id, async () => { await retryJob(id); });
  const handleDelete = (id: string) =>
    withBusy(id, async () => { await deleteJob(id); });

  // ── Derived counts ─────────────────────────────────────────────────────────

  const counts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    processing: tasks.filter(t => t.status === 'processing').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  };

  if (!isOpen) return null;

  return (
    <div id="queue-manager-window" style={styles.window}>
      {/* ── Window chrome ── */}
      <div style={styles.titleBar}>
        <div style={styles.titleGroup}>
          <span style={styles.titleIcon}>⚙️</span>
          <div>
            <h2 style={styles.title}>Gestionnaire de File d'Attente</h2>
            <p style={styles.subtitle}>
              Rafraîchi à {lastRefreshed.toLocaleTimeString()} ·{' '}
              {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            id="queue-refresh-btn"
            onClick={fetchData}
            style={styles.iconBtn}
            title="Rafraîchir maintenant"
          >
            🔄
          </button>
          {onClose && (
            <button
              id="queue-close-btn"
              onClick={onClose}
              style={styles.iconBtn}
              title="Fermer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={styles.statsBar}>
        <StatChip label="En attente" count={counts.pending} color="#f59e0b" />
        <StatChip label="En cours" count={counts.processing} color="#60a5fa" pulse />
        <StatChip label="Terminées" count={counts.completed} color="#34d399" />
        <StatChip label="Échouées" count={counts.failed} color="#f87171" />
        <StatChip label="Annulées" count={counts.cancelled} color="#9ca3af" />

        {stats && (
          <div style={styles.throughput}>
            <span style={styles.throughputLabel}>Débit</span>
            <span style={styles.throughputValue}>
              {stats.throughput_per_second
                ? `${stats.throughput_per_second.toFixed(2)}/s`
                : '—'}
            </span>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={styles.toolbar}>
        {/* Status filter */}
        <select
          id="queue-filter-select"
          value={filter}
          onChange={e => setFilter(e.target.value as StatusFilter)}
          style={styles.select}
          title="Filtrer par statut"
        >
          <option value="all">Toutes les tâches</option>
          <option value="pending">⏳ En attente</option>
          <option value="processing">⚙️ En cours</option>
          <option value="completed">✅ Terminées</option>
          <option value="failed">❌ Échouées</option>
          <option value="cancelled">🚫 Annulées</option>
        </select>

        {/* Interval selector */}
        <select
          id="queue-interval-select"
          value={refreshInterval}
          onChange={e => setRefreshInterval(Number(e.target.value))}
          style={{ ...styles.select, width: '120px' }}
          title="Intervalle de rafraîchissement"
        >
          <option value={3}>3 s</option>
          <option value={5}>5 s</option>
          <option value={10}>10 s</option>
          <option value={30}>30 s</option>
        </select>

        {/* Auto-refresh toggle */}
        <button
          id="queue-autorefresh-btn"
          onClick={() => setAutoRefresh(v => !v)}
          style={{
            ...styles.pillBtn,
            background: autoRefresh ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
            border: autoRefresh ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: autoRefresh ? '#34d399' : '#9ca3af',
          }}
          title={autoRefresh ? 'Désactiver le rafraîchissement auto' : 'Activer le rafraîchissement auto'}
        >
          {autoRefresh ? '🔴 LIVE' : '⏸ PAUSE'}
        </button>
      </div>

      {/* ── Error banner ── */}
      {actionError && (
        <div style={styles.errorBanner}>
          <span>⚠️ {actionError}</span>
          <button onClick={() => setActionError(null)} style={styles.dismissBtn}>✕</button>
        </div>
      )}

      {/* ── Task list ── */}
      <div style={styles.taskList}>
        {loading && tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.spinner} />
            <p>Chargement…</p>
          </div>
        ) : tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '2.5rem' }}>📭</span>
            <p style={{ color: '#9ca3af', marginTop: '8px' }}>Aucune tâche</p>
            <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              Les tâches de génération apparaîtront ici
            </p>
          </div>
        ) : (
          tasks.map((task, index) => (
            <TaskCard
              key={task.job_id}
              task={task}
              index={index}
              isFirst={index === 0}
              isLast={index === tasks.length - 1}
              isExpanded={expandedId === task.job_id}
              isBusy={busyId === task.job_id}
              onToggle={() =>
                setExpandedId(expandedId === task.job_id ? null : task.job_id)
              }
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRetry={handleRetry}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      {stats && (
        <div style={styles.footer}>
          <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
            Total soumis: {stats.total_jobs} · Avg: {stats.avg_execution_time ?? '—'}
          </span>
          <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
            Circuit-breaker: {stats.circuit_breaker_status ?? 'closed'}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatChip({
  label,
  count,
  color,
  pulse = false,
}: {
  label: string;
  count: number;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 14px',
        borderRadius: '10px',
        background: `${color}18`,
        border: `1px solid ${color}40`,
        minWidth: '70px',
        animation: pulse && count > 0 ? 'pulse 2s infinite' : 'none',
      }}
    >
      <span style={{ fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1 }}>
        {count}
      </span>
      <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '2px' }}>
        {label}
      </span>
    </div>
  );
}

interface TaskCardProps {
  task: TaskQueueItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  isBusy: boolean;
  onToggle: () => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

function TaskCard({
  task,
  isFirst,
  isLast,
  isExpanded,
  isBusy,
  onToggle,
  onMoveUp,
  onMoveDown,
  onRetry,
  onDelete,
}: TaskCardProps) {
  const isActive = task.status === 'pending' || task.status === 'processing';

  return (
    <div
      style={{
        ...styles.card,
        opacity: isBusy ? 0.6 : 1,
        transition: 'all 0.2s ease',
        borderColor:
          task.status === 'processing'
            ? 'rgba(96,165,250,0.3)'
            : task.status === 'failed'
            ? 'rgba(248,113,113,0.3)'
            : 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Card header */}
      <div style={styles.cardHeader}>
        {/* Priority badge */}
        <div
          style={{
            ...styles.priorityBadge,
            background:
              task.priority <= 2
                ? 'rgba(248,113,113,0.2)'
                : task.priority <= 5
                ? 'rgba(251,191,36,0.2)'
                : 'rgba(156,163,175,0.15)',
            color:
              task.priority <= 2
                ? '#f87171'
                : task.priority <= 5
                ? '#fbbf24'
                : '#9ca3af',
          }}
          title={`Priorité : ${task.priority}/10`}
        >
          <span style={{ fontSize: '14px' }}>{getPriorityIcon(task.priority)}</span>
          <span style={{ fontSize: '10px', fontWeight: 700 }}>{task.priority}</span>
        </div>

        {/* Info block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                border: '1px solid',
              }}
              className={getStatusColor(task.status)}
            >
              {getStatusIcon(task.status)} {task.status}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
              #{task.shot_count} shots
            </span>
            {task.project_id && (
              <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                · {task.project_id.slice(0, 8)}…
              </span>
            )}
          </div>

          <p style={styles.promptText} title={task.prompt}>
            {task.prompt}
          </p>

          {/* Progress bar */}
          {task.status === 'processing' && (
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.65rem',
                  color: '#9ca3af',
                  marginBottom: '4px',
                }}
              >
                <span>{task.current_step ?? 'Traitement…'}</span>
                <span>{task.progress ?? 0}%</span>
              </div>
              <div
                style={{
                  height: '4px',
                  borderRadius: '99px',
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${task.progress ?? 0}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    borderRadius: '99px',
                    transition: 'width 0.5s ease',
                    boxShadow: '0 0 8px rgba(139,92,246,0.5)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {task.status === 'failed' && task.error && (
            <p style={styles.errorText}>⚠️ {task.error}</p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          style={styles.iconBtn}
          title={isExpanded ? 'Réduire' : 'Détails'}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div style={styles.expandedSection}>
          {/* Timestamps grid */}
          <div style={styles.metaGrid}>
            <MetaCell label="Créé" value={new Date(task.created_at).toLocaleString()} />
            <MetaCell label="Estimé" value={formatEstimatedTime(task.estimated_time)} />
            {task.started_at && (
              <MetaCell label="Début" value={new Date(task.started_at).toLocaleString()} />
            )}
            {task.completed_at && (
              <MetaCell label="Fin" value={new Date(task.completed_at).toLocaleString()} />
            )}
            <MetaCell label="Job ID" value={task.job_id} mono />
          </div>

          {/* Actions */}
          <div style={styles.actionsRow}>
            {/* Move up/down — only for active jobs */}
            {isActive && (
              <>
                <ActionButton
                  id={`queue-move-up-${task.job_id}`}
                  disabled={isFirst || isBusy}
                  onClick={() => onMoveUp(task.job_id)}
                  title="Monter dans la file"
                  emoji="↑"
                  label="Monter"
                  variant="neutral"
                />
                <ActionButton
                  id={`queue-move-down-${task.job_id}`}
                  disabled={isLast || isBusy}
                  onClick={() => onMoveDown(task.job_id)}
                  title="Descendre dans la file"
                  emoji="↓"
                  label="Descendre"
                  variant="neutral"
                />
              </>
            )}

            {/* Retry — for failed/cancelled */}
            {(task.status === 'failed' || task.status === 'cancelled') && (
              <ActionButton
                id={`queue-retry-${task.job_id}`}
                disabled={isBusy}
                onClick={() => onRetry(task.job_id)}
                title="Réessayer ce job"
                emoji="🔄"
                label="Réessayer"
                variant="warning"
              />
            )}

            {/* Delete — for terminal states */}
            {(task.status === 'completed' ||
              task.status === 'failed' ||
              task.status === 'cancelled') && (
              <ActionButton
                id={`queue-delete-${task.job_id}`}
                disabled={isBusy}
                onClick={() => onDelete(task.job_id)}
                title="Supprimer ce job"
                emoji="🗑️"
                label="Supprimer"
                variant="danger"
              />
            )}

            {isBusy && (
              <span style={{ fontSize: '0.7rem', color: '#9ca3af', alignSelf: 'center' }}>
                En cours…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaCell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block' }}>{label}</span>
      <span
        style={{
          fontSize: '0.72rem',
          color: '#d1d5db',
          fontFamily: mono ? 'monospace' : 'inherit',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  id,
  disabled,
  onClick,
  title,
  emoji,
  label,
  variant,
}: {
  id: string;
  disabled: boolean;
  onClick: () => void;
  title: string;
  emoji: string;
  label: string;
  variant: 'neutral' | 'warning' | 'danger';
}) {
  const colorMap = {
    neutral: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', color: '#d1d5db' },
    warning: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24' },
    danger: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', color: '#f87171' },
  };
  const { bg, border, color } = colorMap[variant];

  return (
    <button
      id={id}
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 500,
        border: `1px solid ${border}`,
        background: bg,
        color: disabled ? '#4b5563' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  window: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '560px',
    height: '100%',
    maxHeight: '90vh',
    background: 'rgba(15, 15, 25, 0.92)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
    color: '#e5e7eb',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  titleIcon: {
    fontSize: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e0e7ff, #a5b4fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.7rem',
    color: '#6b7280',
    marginTop: '2px',
  },
  statsBar: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    overflowX: 'auto',
    alignItems: 'center',
  },
  throughput: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 14px',
    borderRadius: '10px',
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.25)',
    marginLeft: 'auto',
  },
  throughputLabel: {
    fontSize: '0.65rem',
    color: '#9ca3af',
  },
  throughputValue: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#a78bfa',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  select: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    color: '#d1d5db',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '0.8rem',
    outline: 'none',
    cursor: 'pointer',
  },
  pillBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'color 0.15s, background 0.15s',
  },
  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '8px 12px 0',
    padding: '8px 12px',
    background: 'rgba(248,113,113,0.12)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: '8px',
    fontSize: '0.78rem',
    color: '#fca5a5',
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: '0 4px',
  },
  taskList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '160px',
    color: '#6b7280',
    fontSize: '0.85rem',
    gap: '4px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(139,92,246,0.2)',
    borderTop: '3px solid #8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    alignItems: 'flex-start',
  },
  priorityBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    gap: '1px',
    flexShrink: 0,
  },
  promptText: {
    margin: '6px 0 0',
    fontSize: '0.82rem',
    color: '#e5e7eb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  errorText: {
    margin: '4px 0 0',
    fontSize: '0.72rem',
    color: '#fca5a5',
  },
  expandedSection: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: 'rgba(0,0,0,0.15)',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  actionsRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.2)',
  },
};

// Inject CSS keyframes
if (typeof document !== 'undefined' && !document.getElementById('queue-manager-keyframes')) {
  const style = document.createElement('style');
  style.id = 'queue-manager-keyframes';
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  `;
  document.head.appendChild(style);
}

export default QueueManagerWindow;
