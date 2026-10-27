import { useEffect, useState } from 'react'
import { listBoardSnapshots } from '../storage'
import type { BoardMeta, BoardSnapshot, SnapshotReason } from '../types'
import { CloseIcon, HistoryIcon } from './icons'

type Props = {
  open: boolean
  board: BoardMeta | null
  busy: boolean
  onClose: () => void
  onRestore: (snapshot: BoardSnapshot) => void
  onCreateSnapshot: (boardId: string) => Promise<void>
}

const REASON_LABELS: Record<SnapshotReason, string> = {
  auto: 'Automatic snapshot',
  manual: 'Manual snapshot',
  'before-restore': 'Before restoring a version',
  'before-layout': 'Before arranging the board',
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function relativeTime(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return relativeFormatter.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return relativeFormatter.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 7) return relativeFormatter.format(-days, 'day')
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function exactTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryDialog({ open, board, busy, onClose, onRestore, onCreateSnapshot }: Props) {
  const [snapshots, setSnapshots] = useState<BoardSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [snapshotting, setSnapshotting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !board) return
    let cancelled = false
    setLoading(true)
    setError(null)
    listBoardSnapshots(board.id)
      .then((list) => {
        if (!cancelled) setSnapshots(list)
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not read version history.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, board?.id])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  if (!open || !board) return null

  const snapshotNow = async () => {
    setSnapshotting(true)
    setError(null)
    try {
      await onCreateSnapshot(board.id)
      setSnapshots(await listBoardSnapshots(board.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save a snapshot.')
    } finally {
      setSnapshotting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="modal-panel dialog-panel history-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Version history"
      >
        <header className="dialog-header">
          <span className="dialog-icon">
            <HistoryIcon size={19} />
          </span>
          <div className="dialog-title">
            <span className="eyebrow">Version history</span>
            <h2>“{board.name}”</h2>
            <p>Automatic snapshots are taken while you edit. Restore any version in one click.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close history" title="Close (Esc)">
            <CloseIcon />
          </button>
        </header>

        <div className="history-list">
          {loading && <div className="history-status">Reading snapshots…</div>}
          {!loading && error && <div className="history-status is-error">{error}</div>}
          {!loading && !error && !snapshots.length && (
            <div className="history-empty">
              <HistoryIcon size={22} />
              <p>No snapshots yet. One is saved automatically within five minutes of editing, or take one now.</p>
            </div>
          )}
          {!loading &&
            snapshots.map((snapshot, index) => (
              <div className="history-row" key={snapshot.id}>
                <span className="history-dot" aria-hidden="true" />
                <div className="history-copy">
                  <strong>
                    {relativeTime(snapshot.createdAt)}
                    {index === 0 && <span className="history-latest">Latest</span>}
                  </strong>
                  <span>
                    {REASON_LABELS[snapshot.reason]} · {snapshot.elementCount}{' '}
                    {snapshot.elementCount === 1 ? 'element' : 'elements'} · {exactTime(snapshot.createdAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => onRestore(snapshot)}
                  disabled={busy || snapshotting}
                >
                  Restore
                </button>
              </div>
            ))}
        </div>

        <footer className="dialog-actions history-actions">
          <span className="dialog-hint">Keep up to 12 versions per board.</span>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => void snapshotNow()}
            disabled={busy || snapshotting || loading}
          >
            {snapshotting ? 'Saving…' : 'Snapshot now'}
          </button>
          <button type="button" className="primary-btn" onClick={onClose} disabled={busy}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
