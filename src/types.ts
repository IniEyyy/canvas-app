import type { BinaryFiles } from '@excalidraw/excalidraw/types'

export type BoardMeta = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  starred: boolean
  template: string
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

export type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'

export type ThemePreference = 'light' | 'dark' | 'system'
