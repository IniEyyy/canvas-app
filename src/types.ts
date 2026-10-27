import type { BinaryFiles } from '@excalidraw/excalidraw/types'

export type BoardMeta = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  starred: boolean
  template: string
  tags: string[]
}

export type BoardIndex = {
  version: 1
  boards: BoardMeta[]
  activeBoardId: string | null
}

export type SceneData = {
  elements: readonly any[]
  appState: Record<string, any>
  files: BinaryFiles
}

export type WorkspaceBackup = {
  app: 'canvas-app'
  version: 1
  exportedAt: number
  boards: Array<{
    meta: BoardMeta
    scene: SceneData
  }>
}

export type BoardSearchHit = {
  boardId: string
  boardName: string
  elementId: string
  kind: 'text' | 'label' | 'frame'
  snippet: string
}

export type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'

export type ThemePreference = 'light' | 'dark' | 'system'

export type SnapshotReason = 'auto' | 'manual' | 'before-restore' | 'before-layout'

export type BoardSnapshot = {
  id: string
  createdAt: number
  reason: SnapshotReason
  elementCount: number
}
