import { useEffect, useRef, useState } from 'react'
import { getTemplate } from '../templates'
import type { BoardMeta } from '../types'
import { CloseIcon, LinkIcon, SearchIcon, TemplateGlyph } from './icons'

type Props = {
  open: boolean
  boards: BoardMeta[]
  activeId: string | null
  busy: boolean
  onClose: () => void
  onPick: (boardId: string) => void
}

export function LinkBoardDialog({ open, boards, activeId, busy, onClose, onPick }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  if (!open) return null

  const normalized = query.trim().toLowerCase()
  const candidates = boards
    .filter((board) => board.id !== activeId)
    .filter(
      (board) =>
        !normalized ||
        board.name.toLowerCase().includes(normalized) ||
        board.tags.some((tag) => tag.toLowerCase().includes(normalized)),
    )
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt - a.updatedAt)

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="modal-panel dialog-panel link-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Link selection to a board"
      >
        <header className="dialog-header">
          <span className="dialog-icon">
            <LinkIcon size={19} />
          </span>
          <div className="dialog-title">
            <span className="eyebrow">Cross-board link</span>
            <h2>Link selection to a board</h2>
            <p>Clicking the link icon on the selected shapes will jump straight to that board.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close link picker" title="Close (Esc)">
            <CloseIcon />
          </button>
        </header>

        <label className="drawer-search dialog-search">
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search boards or tags"
            aria-label="Search boards or tags"
          />
        </label>

        <div className="link-list">
          {candidates.map((board) => {
            const template = getTemplate(board.template)
            return (
              <button
                key={board.id}
                type="button"
                className="link-row"
                onClick={() => onPick(board.id)}
                disabled={busy}
              >
                <span className="board-glyph" style={{ background: `${template.accent}22`, color: template.accent }}>
                  <TemplateGlyph name={template.icon} size={18} />
                </span>
                <span className="link-copy">
                  <strong>{board.name}</strong>
                  <span>
                    {template.name}
                    {board.tags.length ? ` · ${board.tags.join(', ')}` : ''}
                  </span>
                </span>
              </button>
            )
          })}
          {!candidates.length && (
            <div className="history-empty">
              <LinkIcon size={22} />
              <p>{boards.length > 1 ? 'No other boards match your search.' : 'Create another board first to link to it.'}</p>
            </div>
          )}
        </div>

        <footer className="dialog-actions">
          <span className="dialog-hint">The same link can be removed with Excalidraw’s link editor.</span>
          <button type="button" className="secondary-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  )
}
