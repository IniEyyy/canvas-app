import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { TEMPLATES, getTemplate } from '../templates'
import type { TemplateIcon } from '../templates'
import type { BoardMeta } from '../types'
import {
  BoardsIcon,
  DownloadIcon,
  FocusIcon,
  HistoryIcon,
  LayoutIcon,
  LinkIcon,
  MarkdownIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  TemplateGlyph,
  TemplateIcon as TemplatesIcon,
  UploadIcon,
} from './icons'

type Props = {
  open: boolean
  boards: BoardMeta[]
  onClose: () => void
  onOpenBoard: (id: string) => void
  onCreateFromTemplate: (id: string) => void
  onNewBlank: () => void
  onOpenTemplates: () => void
  onOpenBoards: () => void
  onImport: () => void
  onBackup: () => void
  onRestore: () => void
  onPresent: () => void
  onZen: () => void
  onExportMarkdown: () => void
  onHistory: () => void
  onLinkSelection: () => void
  onArrangeMindMap: () => void
}

type SwitcherItem = {
  id: string
  group: 'Boards' | 'Templates' | 'Actions'
  label: string
  hint?: string
  shortcut?: string
  icon?: ReactNode
  glyph?: TemplateIcon
  accent?: string
  run: () => void
}

function fuzzyScore(value: string, query: string): number {
  const target = value.toLowerCase()
  const needle = query.toLowerCase()
  if (!needle) return 0
  const direct = target.indexOf(needle)
  if (direct >= 0) return 1000 - direct
  let cursor = 0
  let score = 0
  for (let index = 0; index < target.length && cursor < needle.length; index += 1) {
    if (target[index] === needle[cursor]) {
      cursor += 1
      score += 1
    }
  }
  return cursor === needle.length ? score : -1
}

export function QuickSwitcher({
  open,
  boards,
  onClose,
  onOpenBoard,
  onCreateFromTemplate,
  onNewBlank,
  onOpenTemplates,
  onOpenBoards,
  onImport,
  onBackup,
  onRestore,
  onPresent,
  onZen,
  onExportMarkdown,
  onHistory,
  onLinkSelection,
  onArrangeMindMap,
}: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const boardItems: SwitcherItem[] = boards
      .map((board) => ({
        board,
        score: normalized ? fuzzyScore(`${board.name} ${board.tags.join(' ')}`, normalized) : 0,
      }))
      .filter((entry) => entry.score >= 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.board.starred) - Number(a.board.starred) ||
          b.board.updatedAt - a.board.updatedAt,
      )
      .slice(0, normalized ? 6 : 5)
      .map(({ board }) => {
        const template = getTemplate(board.template)
        return {
          id: `board-${board.id}`,
          group: 'Boards',
          label: board.name,
          hint: [template.name, board.starred ? 'pinned' : '', board.tags.length ? board.tags.join(', ') : '']
            .filter(Boolean)
            .join(' · '),
          glyph: template.icon,
          accent: template.accent,
          run: () => onOpenBoard(board.id),
        }
      })

    const templateItems: SwitcherItem[] = normalized
      ? TEMPLATES.map((template) => ({
          template,
          score: fuzzyScore(`${template.name} ${template.category}`, normalized),
        }))
          .filter((entry) => entry.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map(({ template }) => ({
            id: `template-${template.id}`,
            group: 'Templates',
            label: template.name,
            hint: template.category,
            glyph: template.icon,
            accent: template.accent,
            run: () => onCreateFromTemplate(template.id),
          }))
      : []

    const actionDefs: SwitcherItem[] = [
      {
        id: 'action-blank',
        group: 'Actions',
        label: 'New blank board',
        hint: 'Start drawing immediately',
        icon: <PlusIcon />,
        run: onNewBlank,
      },
      {
        id: 'action-templates',
        group: 'Actions',
        label: 'Browse templates',
        hint: '18 use cases',
        shortcut: 'Ctrl+Alt+N',
        icon: <TemplatesIcon />,
        run: onOpenTemplates,
      },
      {
        id: 'action-boards',
        group: 'Actions',
        label: 'Open boards',
        hint: 'Switch, rename, star, or delete',
        shortcut: 'Ctrl+B',
        icon: <BoardsIcon />,
        run: onOpenBoards,
      },
      {
        id: 'action-import',
        group: 'Actions',
        label: 'Import scene',
        hint: 'Open an .excalidraw file',
        icon: <UploadIcon />,
        run: onImport,
      },
      {
        id: 'action-backup',
        group: 'Actions',
        label: 'Back up all boards',
        hint: 'Export the whole workspace',
        icon: <DownloadIcon />,
        run: onBackup,
      },
      {
        id: 'action-restore',
        group: 'Actions',
        label: 'Restore backup',
        hint: 'Add boards from a backup file',
        icon: <UploadIcon />,
        run: onRestore,
      },
      {
        id: 'action-markdown',
        group: 'Actions',
        label: 'Export workspace as Markdown',
        hint: 'Every board and frame as a .md file',
        icon: <MarkdownIcon />,
        run: onExportMarkdown,
      },
      {
        id: 'action-history',
        group: 'Actions',
        label: 'Version history',
        hint: 'Restore an earlier snapshot',
        icon: <HistoryIcon />,
        run: onHistory,
      },
      {
        id: 'action-link',
        group: 'Actions',
        label: 'Link selection to a board',
        hint: 'Jump between boards from a shape',
        icon: <LinkIcon />,
        run: onLinkSelection,
      },
      {
        id: 'action-mindmap',
        group: 'Actions',
        label: 'Arrange shapes as a mind map',
        hint: 'Radial tidy-up, snapshot saved first',
        icon: <LayoutIcon />,
        run: onArrangeMindMap,
      },
      {
        id: 'action-present',
        group: 'Actions',
        label: 'Present frames',
        hint: 'Start a slideshow',
        icon: <PlayIcon />,
        run: onPresent,
      },
      {
        id: 'action-zen',
        group: 'Actions',
        label: 'Zen mode',
        hint: 'Hide the interface',
        icon: <FocusIcon />,
        run: onZen,
      },
    ]

    const actions = actionDefs
      .map((action) => ({
        action,
        score: normalized ? fuzzyScore(`${action.label} ${action.hint ?? ''}`, normalized) : 0,
      }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.action)

    return [...boardItems, ...templateItems, ...actions]
  }, [
    boards,
    query,
    onOpenBoard,
    onCreateFromTemplate,
    onNewBlank,
    onOpenTemplates,
    onOpenBoards,
    onImport,
    onBackup,
    onRestore,
    onExportMarkdown,
    onHistory,
    onLinkSelection,
    onArrangeMindMap,
    onPresent,
    onZen,
  ])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (active >= items.length) setActive(Math.max(0, items.length - 1))
  }, [active, items.length])

  useEffect(() => {
    itemRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const choose = (item: SwitcherItem) => {
    onClose()
    item.run()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (items.length ? (current + 1) % items.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (items.length ? (current - 1 + items.length) % items.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = items[active]
      if (item) choose(item)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="quick-switcher-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="quick-switcher-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Quick switcher"
        onKeyDown={handleKeyDown}
      >
        <label className="quick-search">
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            placeholder="Search boards, templates, or actions…"
            aria-label="Search boards, templates, or actions"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Ctrl K</kbd>
        </label>
        <div className="quick-list" role="listbox" aria-label="Quick switcher results">
          {items.map((item, index) => {
            const startsGroup = index === 0 || items[index - 1].group !== item.group
            return (
              <Fragment key={item.id}>
                {startsGroup && <div className="quick-group">{item.group}</div>}
                <button
                  ref={(element) => {
                    itemRefs.current[index] = element
                  }}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`quick-item${index === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                >
                  <span
                    className="quick-glyph"
                    style={item.accent ? { background: `${item.accent}22`, color: item.accent } : undefined}
                  >
                    {item.glyph ? <TemplateGlyph name={item.glyph} size={18} /> : item.icon}
                  </span>
                  <span className="quick-copy">
                    <span className="quick-label">{item.label}</span>
                    {item.hint && <span className="quick-hint">{item.hint}</span>}
                  </span>
                  {item.shortcut && <kbd className="quick-shortcut">{item.shortcut}</kbd>}
                </button>
              </Fragment>
            )
          })}
          {!items.length && (
            <div className="quick-empty">
              <SearchIcon size={18} />
              <span>No boards, templates, or actions match “{query.trim()}”.</span>
            </div>
          )}
        </div>
        <div className="quick-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
