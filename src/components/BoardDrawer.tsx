import { useEffect, useMemo, useRef, useState } from 'react'
import { getTemplate } from '../templates'
import type { BoardMeta, BoardSearchHit, ThemePreference } from '../types'
import {
  CloseIcon,
  DownloadIcon,
  DuplicateIcon,
  HistoryIcon,
  LogoMark,
  MonitorIcon,
  MoonIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  SunIcon,
  TagIcon,
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
  onOpenContent: (boardId: string, elementId: string) => void
  onSearchContent: (query: string) => Promise<BoardSearchHit[]>
  onCreate: () => void
  onImport: () => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (board: BoardMeta) => void
  onToggleStar: (id: string, starred: boolean) => void
  onThemeChange: (theme: ThemePreference) => void
  onEditTags: (board: BoardMeta) => void
  onOpenHistory: (board: BoardMeta) => void
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const KIND_LABELS: Record<BoardSearchHit['kind'], string> = {
  text: 'Text',
  label: 'Shape label',
  frame: 'Frame',
}

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
  onOpenContent,
  onSearchContent,
  onCreate,
  onImport,
  onRename,
  onDuplicate,
  onDelete,
  onToggleStar,
  onThemeChange,
  onEditTags,
  onOpenHistory,
}: Props) {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [contentHits, setContentHits] = useState<BoardSearchHit[]>([])
  const [searchingContent, setSearchingContent] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingId) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingId])

  useEffect(() => {
    if (open) return
    setQuery('')
    setActiveTag(null)
    setContentHits([])
    setSearchingContent(false)
    setEditingId(null)
  }, [open])

  useEffect(() => {
    const normalized = query.trim()
    if (!open || normalized.length < 2) {
      setContentHits([])
      setSearchingContent(false)
      return
    }

    let cancelled = false
    setContentHits([])
    setSearchingContent(true)
    const timer = window.setTimeout(() => {
      onSearchContent(normalized)
        .then((hits) => {
          if (!cancelled) setContentHits(hits)
        })
        .catch((error) => {
          console.error('Canvas search failed:', error)
          if (!cancelled) setContentHits([])
        })
        .finally(() => {
          if (!cancelled) setSearchingContent(false)
        })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, open, onSearchContent])

  const allTags = useMemo(() => {
    const seen = new Map<string, string>()
    for (const board of boards) {
      for (const tag of board.tags) {
        const key = tag.toLowerCase()
        if (!seen.has(key)) seen.set(key, tag)
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [boards])

  const visibleBoards = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const tagged = activeTag ? activeTag.toLowerCase() : null
    return [...boards]
      .filter((board) => !normalized || board.name.toLowerCase().includes(normalized) || board.tags.some((tag) => tag.toLowerCase().includes(normalized)))
      .filter((board) => !tagged || board.tags.some((tag) => tag.toLowerCase() === tagged))
      .sort((a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt - a.updatedAt)
  }, [boards, query, activeTag])

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
          placeholder="Search boards and canvas text"
          aria-label="Search boards and canvas text"
        />
      </label>

      {allTags.length > 0 && (
        <div className="tag-filter" role="group" aria-label="Filter boards by tag">
          <button
            type="button"
            className={`tag-filter-chip${activeTag === null ? ' is-selected' : ''}`}
            onClick={() => setActiveTag(null)}
            aria-pressed={activeTag === null}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-filter-chip${activeTag === tag ? ' is-selected' : ''}`}
              onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
              aria-pressed={activeTag === tag}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

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
                {board.tags.length > 0 && (
                  <span className="board-tags">
                    {board.tags.map((tag) => (
                      <span key={tag} className="board-tag">
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
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
                  title="Edit tags"
                  aria-label="Edit tags"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEditTags(board)
                  }}
                >
                  <TagIcon size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  title="Version history"
                  aria-label="Version history"
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpenHistory(board)
                  }}
                >
                  <HistoryIcon size={14} />
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
        {query.trim().length >= 2 && (
          <div className="content-results">
            <div className="drawer-section-label content-label">
              <span>Canvas text</span>
              <span>{searchingContent ? '…' : contentHits.length}</span>
            </div>
            {searchingContent && <div className="content-status">Searching canvas text…</div>}
            {contentHits.map((hit) => (
              <button
                key={`${hit.boardId}:${hit.elementId}`}
                type="button"
                className="content-hit"
                onClick={() => onOpenContent(hit.boardId, hit.elementId)}
              >
                <span className="content-meta">
                  <span className="content-board">{hit.boardName}</span>
                  <span className="content-kind">{KIND_LABELS[hit.kind]}</span>
                </span>
                <span className="content-snippet">
                  <HighlightText text={hit.snippet} query={query.trim()} />
                </span>
              </button>
            ))}
            {!searchingContent && !contentHits.length && (
              <div className="content-status">
                {visibleBoards.length
                  ? 'No canvas text matches.'
                  : `No boards or canvas text match “${query.trim()}”.`}
              </div>
            )}
          </div>
        )}
        {!visibleBoards.length && query.trim().length < 2 && (
          <div className="drawer-empty">
            <SearchIcon size={20} />
            <p>
              {query.trim()
                ? `No boards match “${query.trim()}”.`
                : activeTag
                  ? `No boards tagged “${activeTag}”.`
                  : 'No boards yet.'}
            </p>
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

function HighlightText({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  )
}
