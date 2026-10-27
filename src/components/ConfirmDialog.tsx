import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { TrashIcon } from './icons'

type Props = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  icon?: ReactNode
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger = false,
  busy = false,
  icon,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
      if (event.key === 'Enter' && !busy) {
        event.preventDefault()
        onConfirm()
      }
    }
    // Defer attaching so the key press that opened the dialog can't confirm it.
    const attach = window.setTimeout(() => window.addEventListener('keydown', onKeyDown), 0)
    return () => {
      window.clearTimeout(attach)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, busy, onCancel, onConfirm])

  if (!open) return null

  return (
    <div
      className="modal-backdrop confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div className="modal-panel confirm-panel" role="alertdialog" aria-modal="true" aria-label={title}>
        <span className={`confirm-icon${danger ? ' danger' : ''}`}>
          {icon ?? <TrashIcon size={20} />}
        </span>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="confirm-actions">
          <button type="button" className="secondary-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'danger-btn' : 'primary-btn'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
