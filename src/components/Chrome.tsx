import type { SaveState } from '../types'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, LogoMark } from './icons'

const SAVE_LABELS: Record<SaveState, string> = {
  saved: 'Saved',
  unsaved: 'Unsaved',
  saving: 'Saving',
  error: 'Save failed',
}

export function SavePill({
  name,
  state,
  shifted,
  onClick,
}: {
  name: string
  state: SaveState
  shifted: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`save-pill${shifted ? ' is-shifted' : ''}`}
      onClick={onClick}
      title="Open boards (Ctrl+B)"
    >
      <span className={`save-dot ${state}`} aria-hidden="true" />
      <span className="save-board-name">{name}</span>
      <span className="save-status" aria-live="polite">
        {SAVE_LABELS[state]}
      </span>
    </button>
  )
}

export function PresentationBar({
  current,
  total,
  onPrev,
  onNext,
  onExit,
}: {
  current: number
  total: number
  onPrev: () => void
  onNext: () => void
  onExit: () => void
}) {
  return (
    <div className="presentation-bar" role="toolbar" aria-label="Presentation controls">
      <span className="presentation-brand">
        <LogoMark size={18} />
        Presenting
      </span>
      <div className="presentation-controls">
        <button
          type="button"
          className="icon-btn"
          onClick={onPrev}
          disabled={total === 0 || current <= 0}
          aria-label="Previous slide"
          title="Previous (←)"
        >
          <ChevronLeftIcon />
        </button>
        <span className="presentation-count">
          {total ? `${current + 1} / ${total}` : 'Canvas'}
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={onNext}
          disabled={total === 0 || current >= total - 1}
          aria-label="Next slide"
          title="Next (→)"
        >
          <ChevronRightIcon />
        </button>
      </div>
      <button type="button" className="presentation-exit" onClick={onExit}>
        <CloseIcon size={14} />
        Exit
      </button>
    </div>
  )
}

export function ZenBar({ onExit }: { onExit: () => void }) {
  return (
    <div className="zen-bar">
      <span>Zen mode</span>
      <button type="button" onClick={onExit}>
        Exit <kbd>Esc</kbd>
      </button>
    </div>
  )
}
