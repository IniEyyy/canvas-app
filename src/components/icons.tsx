import type { ReactNode } from 'react'
import type { TemplateIcon } from '../templates'

type IconProps = {
  size?: number
  className?: string
}

function Icon({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function LogoMark({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M9 22.5c4.6-.6 8.2-4.4 10.4-11.1 1 4.2 2.4 6.9 4.6 8.3-4 3.3-9.1 4.5-15 2.8Z"
        fill="white"
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BoardsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="7" height="7" rx="2" />
      <rect x="14" y="4" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function SaveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4h11l3 3v13H5V4Z" />
      <path d="M8 4v6h7V4M8 20v-6h8v6" />
    </Icon>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
    </Icon>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 16V5M8 9l4-4 4 4M5 20h14" />
    </Icon>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </Icon>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5.5v13l10-6.5-10-6.5Z" />
    </Icon>
  )
}

export function FocusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
      <circle cx="12" cy="12" r="2.5" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </Icon>
  )
}

export function StarIcon({ size = 16, className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m12 4 2.5 5.1 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 4Z" />
    </svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4" />
    </Icon>
  )
}

export function DuplicateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      <path d="M14 12v4M12 14h4" />
    </Icon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Icon>
  )
}

export function MonitorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M9 21h6M12 17v4" />
    </Icon>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m15 5-7 7 7 7" />
    </Icon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  )
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </Icon>
  )
}

export function TemplateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12 4 4L19 6" />
    </Icon>
  )
}

export function HistoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.8" />
      <path d="M4 4v4.8h4.8" />
      <path d="M12 8v4.5l3 1.8" />
    </Icon>
  )
}

export function TagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8L3 11Z" />
      <circle cx="7.6" cy="7.6" r="1.4" />
    </Icon>
  )
}

export function LinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.6 6.7" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.4-1.4" />
    </Icon>
  )
}

export function LayoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="5" cy="5.5" r="2.1" />
      <circle cx="19" cy="5.5" r="2.1" />
      <circle cx="5" cy="18.5" r="2.1" />
      <circle cx="19" cy="18.5" r="2.1" />
      <path d="m9.9 10.6-3.2-3.4M14.1 10.6l3.2-3.4M9.9 13.4l-3.2 3.4M14.1 13.4l3.2 3.4" />
    </Icon>
  )
}

export function MarkdownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M6.5 15V9l2.5 3 2.5-3v6M15 9v6M15 15l2-2M15 15l-2-2" />
    </Icon>
  )
}

export function TemplateGlyph({ name, size = 22 }: { name: TemplateIcon; size?: number }) {
  const props = { size }
  switch (name) {
    case 'blank':
      return (
        <Icon {...props}>
          <path d="M12 6v12M6 12h12" />
        </Icon>
      )
    case 'spark':
      return <SparkIcon {...props} />
    case 'kanban':
      return (
        <Icon {...props}>
          <rect x="4" y="4" width="4" height="16" rx="1.5" />
          <rect x="10" y="4" width="4" height="11" rx="1.5" />
          <rect x="16" y="4" width="4" height="14" rx="1.5" />
        </Icon>
      )
    case 'flow':
      return (
        <Icon {...props}>
          <rect x="8" y="3" width="8" height="5" rx="1.5" />
          <rect x="3" y="15" width="7" height="5" rx="1.5" />
          <rect x="14" y="15" width="7" height="5" rx="1.5" />
          <path d="M12 8v4M6.5 15v-3h11v3" />
        </Icon>
      )
    case 'mindmap':
      return (
        <Icon {...props}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="5" cy="5" r="2" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="m9.5 9.5-3-3M14.5 9.5l3-3M9.5 14.5l-3 3M14.5 14.5l3 3" />
        </Icon>
      )
    case 'wireframe':
      return (
        <Icon {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 8h18M7 12h4M7 15h7" />
        </Icon>
      )
    case 'journey':
      return (
        <Icon {...props}>
          <circle cx="5" cy="17" r="2" />
          <circle cx="12" cy="7" r="2" />
          <circle cx="19" cy="15" r="2" />
          <path d="M7 17h3l2-8h2l3 6" />
        </Icon>
      )
    case 'swot':
      return (
        <Icon {...props}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </Icon>
      )
    case 'retro':
      return (
        <Icon {...props}>
          <path d="M4 10a8 8 0 1 1 2 7M4 5v5h5" />
        </Icon>
      )
    case 'meeting':
      return (
        <Icon {...props}>
          <path d="M5 3h11l3 3v15H5V3Z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </Icon>
      )
    case 'week':
      return (
        <Icon {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2M14 17h2" />
        </Icon>
      )
    case 'study':
      return (
        <Icon {...props}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 23V5.5Z" />
          <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
        </Icon>
      )
    case 'roadmap':
      return (
        <Icon {...props}>
          <path d="M4 18h6l2-6h6l2-6" />
          <circle cx="4" cy="18" r="1.5" />
          <circle cx="20" cy="6" r="1.5" />
        </Icon>
      )
    case 'org':
      return (
        <Icon {...props}>
          <rect x="9" y="3" width="6" height="5" rx="1.5" />
          <rect x="3" y="16" width="6" height="5" rx="1.5" />
          <rect x="15" y="16" width="6" height="5" rx="1.5" />
          <path d="M12 8v4M6 16v-4h12v4" />
        </Icon>
      )
    case 'storyboard':
      return (
        <Icon {...props}>
          <rect x="3" y="4" width="8" height="7" rx="1.5" />
          <rect x="13" y="4" width="8" height="7" rx="1.5" />
          <rect x="3" y="13" width="8" height="7" rx="1.5" />
          <rect x="13" y="13" width="8" height="7" rx="1.5" />
        </Icon>
      )
    case 'venn':
      return (
        <Icon {...props}>
          <circle cx="9" cy="12" r="5" />
          <circle cx="15" cy="12" r="5" />
        </Icon>
      )
    case 'sequence':
      return (
        <Icon {...props}>
          <path d="M6 4v16M12 4v16M18 4v16M3 8h6M9 13h6M15 18h6" />
        </Icon>
      )
    case 'deck':
      return (
        <Icon {...props}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M9 20l3-4 3 4" />
        </Icon>
      )
    default:
      return <TemplateIcon {...props} />
  }
}
