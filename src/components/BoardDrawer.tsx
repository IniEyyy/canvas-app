import { useEffect, useMemo, useRef, useState } from 'react'
import { getTemplate } from '../templates'
import type { BoardMeta, ThemePreference } from '../types'
import {
  CloseIcon,
  DownloadIcon,
  DuplicateIcon,
  LogoMark,
  MonitorIcon,
  MoonIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  SunIcon,
  TemplateGlyph,
  TrashIcon,
  UploadIcon,
} from './icons'

type Props = {
  open: boolean
  boards: BoardMeta[]
  activeId: string | null
  theme: ThemePreference
  storageLabel: string
  isDesktop: boolean
  busy: boolean
  onClose: () => void
  onOpen: (id: string) => void
  onCreate: () => void
  onImport: () => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (board: BoardMeta) => void
  onToggleStar: (id: string, starred: boolean) => void
  onThemeChange: (theme: ThemePreference) => void
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

export function BoardDrawer({
  open,
  boards,
  activeId,
  theme,
  storageLabel,
  isDesktop,
  busy,
  onClose,
  onOpen,
  onCreate,
  onImport,
  onRename,
  onDuplicate,
  onDelete,
  onToggleStar,
  onThemeChange,
}: Props) {
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingId) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingId])

  const visibleBoards = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [...boards]
      .filter((board) => !normalized || board.name.toLowerCase().includes(normalized))
      .sort((a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt - a.updatedAt)
  }, [boards, query])

  const startRename = (board: BoardMeta) => {
    setEditingId(board.id)
    setDraft(board.name)
  }

  const commitRename = () => {
    const id = editingId
    if (!id) return
    const board = boards.find((item) => item.id === id)
    const name = draft.trim()
    setEditingId(null)
    if (name && name !== board?.name) onRename(id, name)
  }

  const cancelRename = () => {
    setEditingId(null)
  }

  return (
    <aside className={`board-drawer${open ? ' is-open' : ''}`} aria-label="Boards" aria-hidden={!open}>
      <header className="drawer-header">
        <div className="drawer-brand">
          <LogoMark size={34} className="brand-mark" />
          <div>
            <strong>Canvas</strong>
            <span>Local-first whiteboards</span>
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close boards" title="Close (Esc)">
          <CloseIcon />
        </button>
      </header>

      <div className="drawer-actions">
        <button type="button" className="primary-btn" onClick={onCreate} disabled={busy}>
          <PlusIcon />
          {busy ? 'Working…' : 'New board'}
        </button>
        <button type="button" className="secondary-btn" onClick={onImport} disabled={busy} title="Import an .excalidraw file">
          <UploadIcon />
          Import
        </button>
      </div>

      <label className="drawer-search">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search boards"
          aria-label="Search boards"
        />
      </label>

      <div className="drawer-section-label">
        <span>Your boards</span>
        <span>{boards.length}</span>
      </div>

      <div className="board-list">
        {visibleBoards.map((board) => {
          const template = getTemplate(board.template)
          const isActive = board.id === activeId
          const isEditing = editingId === board.id
          return (
            <div
              key={board.id}
              className={`board-row${isActive ? ' is-active' : ''}`}
              role="button"
              tabIndex={0}
              aria-current={isActive}
              onClick={() => {
                if (!isEditing) onOpen(board.id)
              }}
              onKeyDown={(event) => {
                if (isEditing) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpen(board.id)
                }
              }}
            >
              <span className="board-glyph" style={{ background: `${template.accent}22`, color: template.accent }}>
                <BoardGlyph templateId={board.template} />
              </span>
              <div className="board-info">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    className="rename-input"
                    value={draft}
                    maxLength={80}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commitRename}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        commitRename()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        event.stopPropagation()
                        cancelRename()
                      }
                    }}
                    aria-label="Board name"
                  />
                ) : (
                  <span className="board-name">
                    {board.name}
                    {board.starred && <StarIcon size={12} filled className="board-starred" />}
                  </span>
                )}
                <span className="board-meta">
                  {template.name} · {relativeTime(board.updatedAt)}
                </span>
              </div>
              <div className="board-actions">
                <button
                  type="button"
                  className="icon-btn small"
                  title={board.starred ? 'Unpin board' : 'Pin board'}
                  aria-label={board.starred ? 'Unpin board' : 'Pin board'}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleStar(board.id, !board.starred)
                  }}
                >
                  <StarIcon size={14} filled={board.starred} />
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  title="Rename board"
                  aria-label="Rename board"
                  onClick={(event) => {
                    event.stopPropagation()
                    startRename(board)
                  }}
                >
                  <PencilIcon size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  title="Duplicate board"
                  aria-label="Duplicate board"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDuplicate(board.id)
                  }}
                >
                  <DuplicateIcon size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn small danger"
                  title="Delete board"
                  aria-label="Delete board"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(board)
                  }}
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          )
        })}
        {!visibleBoards.length && (
          <div className="drawer-empty">
            <SearchIcon size={20} />
            <p>No boards match “{query}”.</p>
          </div>
        )}
      </div>

      <footer className="drawer-footer">
        <div className="theme-switch" role="group" aria-label="Appearance">
          <button
            type="button"
            className={theme === 'light' ? 'is-selected' : ''}
            onClick={() => onThemeChange('light')}
            title="Light theme"
            aria-pressed={theme === 'light'}
          >
            <SunIcon size={14} />
            Light
          </button>
          <button
            type="button"
            className={theme === 'dark' ? 'is-selected' : ''}
            onClick={() => onThemeChange('dark')}
            title="Dark theme"
            aria-pressed={theme === 'dark'}
          >
            <MoonIcon size={14} />
            Dark
          </button>
          <button
            type="button"
            className={theme === 'system' ? 'is-selected' : ''}
            onClick={() => onThemeChange('system')}
            title="Follow the system theme"
            aria-pressed={theme === 'system'}
          >
            <MonitorIcon size={14} />
            Auto
          </button>
        </div>
        <div className="storage-line" title={storageLabel}>
          {isDesktop ? <DownloadIcon size={13} /> : <MonitorIcon size={13} />}
          <span>{isDesktop ? 'Stored in app data' : 'Stored in this browser'}</span>
        </div>
      </footer>
    </aside>
  )
}

function BoardGlyph({ templateId }: { templateId: string }) {
  return <TemplateGlyph name={getTemplate(templateId).icon} size={20} />
}
