import { getTemplate } from '../templates'
import type { BoardMeta, SceneData } from '../types'

type TextEntry = {
  x: number
  y: number
  text: string
  frameId?: string | null
}

type FrameEntry = {
  id: string
  name: string
  x: number
  y: number
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function stamp(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ')
}

function collectEntries(elements: readonly any[]): TextEntry[] {
  const entries: TextEntry[] = []
  for (const element of elements) {
    if (!element || element.isDeleted) continue
    if (element.type === 'frame') continue
    if (element.type === 'text') {
      if (element.containerId) continue
      const text = cleanText(element.text)
      if (text) entries.push({ x: element.x, y: element.y, text, frameId: element.frameId })
      continue
    }
    const label = cleanText(element.label?.text)
    if (label) entries.push({ x: element.x, y: element.y, text: label, frameId: element.frameId })
  }
  return entries.sort((a, b) => a.y - b.y || a.x - b.x)
}

function bullets(entries: TextEntry[]): string[] {
  return entries.map((entry) => `- ${entry.text}`)
}

export function boardToMarkdown(board: BoardMeta, scene: SceneData): string {
  const elements = scene.elements.filter((element: any) => element && !element.isDeleted)
  const frames: FrameEntry[] = elements
    .filter((element: any) => element.type === 'frame')
    .map((element: any) => ({
      id: element.id,
      name: cleanText(element.name) || 'Untitled frame',
      x: element.x,
      y: element.y,
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const entries = collectEntries(elements)

  const meta = [`_${getTemplate(board.template).name}`]
  if (board.tags.length) meta.push(`Tags: ${board.tags.join(', ')}`)
  meta.push(`Updated ${stamp(board.updatedAt || board.createdAt)}`)
  const lines = [`## ${board.name}`, '', `${meta.join(' · ')}_`, '']

  if (frames.length) {
    for (const frame of frames) {
      const inside = entries.filter((entry) => entry.frameId === frame.id)
      lines.push(`### ${frame.name}`, '')
      if (inside.length) lines.push(...bullets(inside))
      else lines.push('_No text in this frame._')
      lines.push('')
    }
    const unfiled = entries.filter((entry) => !entry.frameId || !frames.some((frame) => frame.id === entry.frameId))
    if (unfiled.length) {
      lines.push('### Unfiled', '', ...bullets(unfiled), '')
    }
  } else if (entries.length) {
    lines.push(...bullets(entries), '')
  } else {
    lines.push('_No text on this board._', '')
  }

  return lines.join('\n').trimEnd()
}

export function workspaceToMarkdown(
  boards: Array<{ board: BoardMeta; scene: SceneData }>,
  exportedAt = Date.now(),
): string {
  const sorted = [...boards].sort((a, b) => b.board.updatedAt - a.board.updatedAt)
  const count = sorted.length
  const lines = [
    '# Canvas workspace',
    '',
    `_Exported ${stamp(exportedAt)} · ${count} ${count === 1 ? 'board' : 'boards'}_`,
    '',
    '---',
    '',
    sorted.map(({ board, scene }) => boardToMarkdown(board, scene)).join('\n\n---\n\n'),
    '',
  ]
  return lines.join('\n')
}
