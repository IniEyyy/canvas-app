import { useEffect, useRef, useState } from 'react'
import type { BoardMeta } from '../types'
import { CloseIcon, TagIcon } from './icons'

type Props = {
  open: boolean
  board: BoardMeta | null
  allTags: string[]
  busy: boolean
  onClose: () => void
  onSave: (id: string, tags: string[]) => void
}

const MAX_TAGS = 8
const MAX_TAG_LENGTH = 24

function cleanTag(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH)
}

export function TagsDialog({ open, board, allTags, busy, onClose, onSave }: Props) {
  const [tags, setTags] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTags(board?.tags ?? [])
    setDraft('')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60)
    return () => window.clearTimeout(timer)
  }, [open, board?.id, board?.tags])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  if (!open || !board) return null

  const addTag = (raw: string) => {
    const tag = cleanTag(raw)
    if (!tag) return
    setDraft('')
    if (tags.length >= MAX_TAGS) return
    if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return
    setTags([...tags, tag])
  }

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((item) => item !== tag))
  }

  const save = () => {
    const next = [...tags]
    const pending = cleanTag(draft)
    if (pending && next.length < MAX_TAGS && !next.some((tag) => tag.toLowerCase() === pending.toLowerCase())) {
      next.push(pending)
    }
    onSave(board.id, next)
  }

  const suggestions = allTags
    .filter((tag) => !tags.some((existing) => existing.toLowerCase() === tag.toLowerCase()))
    .slice(0, 8)

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div className="modal-panel dialog-panel tags-panel" role="dialog" aria-modal="true" aria-label="Board tags">
        <header className="dialog-header">
          <span className="dialog-icon">
            <TagIcon size={19} />
          </span>
          <div className="dialog-title">
            <span className="eyebrow">Organize</span>
            <h2>Tags for “{board.name}”</h2>
            <p>Group boards by course, project, or client and filter them from the board drawer.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close tags" title="Close (Esc)">
            <CloseIcon />
          </button>
        </header>

        <div className="tags-editor">
          <div className="tag-list">
            {tags.map((tag) => (
              <span key={tag} className="tag-pill">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                  ×
                </button>
              </span>
            ))}
            {!tags.length && <span className="tags-empty">No tags yet — add the first one below.</span>}
          </div>

          <form
            className="tag-add"
            onSubmit={(event) => {
              event.preventDefault()
              addTag(draft)
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a tag and press Enter"
              maxLength={MAX_TAG_LENGTH}
              disabled={busy || tags.length >= MAX_TAGS}
              aria-label="New tag"
            />
            <button
              type="submit"
              className="secondary-btn"
              disabled={busy || !draft.trim() || tags.length >= MAX_TAGS}
            >
              Add
            </button>
          </form>
          <span className="tags-limit">
            {tags.length}/{MAX_TAGS} tags{tags.length >= MAX_TAGS ? ' — remove one to add another.' : ''}
          </span>

          {suggestions.length > 0 && (
            <div className="tag-suggestions">
              <span>Use an existing tag</span>
              <div>
                {suggestions.map((tag) => (
                  <button key={tag} type="button" className="chip" onClick={() => addTag(tag)} disabled={busy}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="dialog-actions">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save tags'}
          </button>
        </footer>
      </div>
    </div>
  )
}
