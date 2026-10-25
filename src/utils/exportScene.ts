import {
  exportToBlob,
  exportToClipboard,
  exportToSvg,
  serializeAsJSON,
} from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { sanitizeFilename, saveBlob } from './files'

export type ExportKind = 'png' | 'svg' | 'json' | 'copy'
export type ExportResult = 'saved' | 'canceled' | 'copied'

export async function runExport(
  api: ExcalidrawImperativeAPI,
  kind: ExportKind,
  boardName: string,
): Promise<ExportResult> {
  const elements = api.getSceneElements()
  const appState = api.getAppState()
  const files = api.getFiles()
  const base = sanitizeFilename(boardName)

  if (!elements.length && kind !== 'json') {
    throw new Error('The canvas is empty. Draw something first.')
  }

  if (kind === 'copy') {
    await exportToClipboard({
      elements: elements as any,
      appState,
      files,
      type: 'png',
      mimeType: 'image/png',
    })
    return 'copied'
  }

  if (kind === 'json') {
    const json = serializeAsJSON(elements as any, appState, files, 'local')
    const blob = new Blob([json], { type: 'application/json' })
    const saved = await saveBlob(blob, `${base}.excalidraw`, {
      name: 'Excalidraw scene',
      extensions: ['excalidraw'],
    })
    return saved ? 'saved' : 'canceled'
  }

  if (kind === 'svg') {
    const svg = await exportToSvg({
      elements: elements as any,
      appState,
      files,
      exportPadding: 24,
    })
    const markup = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([markup], { type: 'image/svg+xml' })
    const saved = await saveBlob(blob, `${base}.svg`, { name: 'SVG image', extensions: ['svg'] })
    return saved ? 'saved' : 'canceled'
  }

  const blob = await exportToBlob({
    elements: elements as any,
    appState,
    files,
    mimeType: 'image/png',
    exportPadding: 24,
    getDimensions: (width: number, height: number) => ({
      width: width * 2,
      height: height * 2,
      scale: 2,
    }),
  })
  const saved = await saveBlob(blob, `${base}.png`, { name: 'PNG image', extensions: ['png'] })
  return saved ? 'saved' : 'canceled'
}
