import { useEffect, useMemo, useRef, useState } from 'react'
import { TEMPLATES, type TemplateCategory } from '../templates'
import type { TemplateDef } from '../templates'
import { getTemplatePreview } from '../utils/templatePreview'
import { CloseIcon, SearchIcon, TemplateGlyph } from './icons'

type Props = {
  open: boolean
  busy: boolean
  theme: 'light' | 'dark'
  onClose: () => void
  onPick: (id: string) => void
}

const CATEGORIES: Array<TemplateCategory | 'All'> = [
  'All',
  'Start',
  'Ideation',
  'Planning',
  'Diagrams',
  'Product',
  'Study',
  'Strategy',
  'Teams',
  'Presenting',
]

export function TemplatePicker({ open, busy, theme, onClose, onPick }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TemplateCategory | 'All'>('All')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setCategory('All')
    const timer = window.setTimeout(() => searchRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return TEMPLATES.filter((template) => {
      const matchesCategory = category === 'All' || template.category === category
      const matchesQuery =
        !normalized ||
        template.name.toLowerCase().includes(normalized) ||
        template.description.toLowerCase().includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [query, category])

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div className="modal-panel template-panel" role="dialog" aria-modal="true" aria-label="Choose a template">
        <header className="template-header">
          <div>
            <span className="eyebrow">New board</span>
            <h2>Start with a use case</h2>
            <p>Pick a ready-made canvas, then make it yours.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close templates" title="Close (Esc)">
            <CloseIcon />
          </button>
        </header>

        <div className="template-toolbar">
          <label className="drawer-search template-search">
            <SearchIcon />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates"
              aria-label="Search templates"
            />
          </label>
          <div className="category-chips" role="group" aria-label="Template category">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip${category === item ? ' is-selected' : ''}`}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="template-grid">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              theme={theme}
              busy={busy}
              onPick={onPick}
            />
          ))}
          {!filtered.length && (
            <div className="template-empty">
              <SearchIcon size={22} />
              <p>No templates match your search.</p>
            </div>
          )}
        </div>

        <footer className="template-footer">
          <span>Every board saves automatically to this device.</span>
          {busy && (
            <span className="working">
              <span className="spinner" />
              Creating board…
            </span>
          )}
        </footer>
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  theme,
  busy,
  onPick,
}: {
  template: TemplateDef
  theme: 'light' | 'dark'
  busy: boolean
  onPick: (id: string) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPreview(null)
    getTemplatePreview(template.id, theme).then((url) => {
      if (!cancelled) setPreview(url)
    })
    return () => {
      cancelled = true
    }
  }, [template.id, theme])

  return (
    <button
      type="button"
      className="template-card"
      onClick={() => onPick(template.id)}
      disabled={busy}
      style={{ ['--card-accent' as string]: template.accent }}
    >
      <span
        className="template-preview"
        style={{ background: `linear-gradient(135deg, ${template.accent}26, ${template.accent}0a)` }}
      >
        {preview ? (
          <img className="template-preview-image" src={preview} alt="" loading="lazy" draggable={false} />
        ) : (
          <span className="template-glyph" style={{ color: template.accent, background: `${template.accent}1f` }}>
            <TemplateGlyph name={template.icon} size={24} />
          </span>
        )}
        <span className="template-category">{template.category}</span>
      </span>
      <span className="template-copy">
        <strong>{template.name}</strong>
        <span>{template.description}</span>
      </span>
    </button>
  )
}
