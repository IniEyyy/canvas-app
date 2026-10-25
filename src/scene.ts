import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import type { SceneData } from './types'

const APP_STATE_KEYS = [
  'viewBackgroundColor',
  'gridSize',
  'gridModeEnabled',
  'objectsSnapModeEnabled',
  'scrollX',
  'scrollY',
  'zoom',
  'currentItemStrokeColor',
  'currentItemBackgroundColor',
  'currentItemFillStyle',
  'currentItemStrokeWidth',
  'currentItemStrokeStyle',
  'currentItemRoughness',
  'currentItemOpacity',
  'currentItemFontFamily',
  'currentItemFontSize',
  'currentItemTextAlign',
  'currentItemStartArrowhead',
  'currentItemEndArrowhead',
  'currentItemRoundness',
  'currentItemArrowType',
  'exportBackground',
  'exportWithDarkMode',
  'exportScale',
] as const

export const DEFAULT_APP_STATE: Record<string, any> = {
  viewBackgroundColor: '#ffffff',
  currentItemRoughness: 1,
  currentItemStrokeWidth: 2,
  currentItemFontFamily: 1,
  currentItemFontSize: 20,
  exportBackground: true,
  exportScale: 2,
}

export function cleanAppState(appState: Record<string, any> = {}): Record<string, any> {
  const cleaned: Record<string, any> = {}
  for (const key of APP_STATE_KEYS) {
    if (appState[key] !== undefined) cleaned[key] = appState[key]
  }
  return cleaned
}

export function blankScene(): SceneData {
  return {
    elements: [],
    appState: { ...DEFAULT_APP_STATE },
    files: {} as BinaryFiles,
  }
}

export function normalizeScene(raw: any): SceneData {
  return {
    elements: Array.isArray(raw?.elements) ? raw.elements : [],
    appState: cleanAppState(raw?.appState ?? {}),
    files: (raw?.files && typeof raw.files === 'object' ? raw.files : {}) as BinaryFiles,
  }
}

export function toInitialData(scene: SceneData, scrollToContent = false) {
  return {
    elements: scene.elements as any,
    appState: { ...DEFAULT_APP_STATE, ...scene.appState },
    files: scene.files,
    scrollToContent,
  }
}
