import { isTauri } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import type { BoardIndex, BoardMeta, SceneData } from './types'
import { blankScene, cleanAppState, normalizeScene } from './scene'
import { bytesToDataUrl, dataUrlToBytes, extFromMime, mimeFromExt } from './utils/dataUrl'

const INDEX_FILE = 'boards.json'
const BOARDS_DIR = 'boards'
const BOARD_FILE = 'board.json'
const ASSETS_DIR = 'assets'
const LEGACY_BOARD_FILE = 'board.json'
const LEGACY_ASSETS_DIR = 'assets'
const BROWSER_INDEX_KEY = 'canvas-app:index'
const BROWSER_BOARD_PREFIX = 'canvas-app:board:'

let cache: BoardIndex | null = null
const savedFileIds = new Map<string, Set<string>>()

function isDesktop(): boolean {
  return isTauri()
}

function now(): number {
  return Date.now()
}

function boardKey(id: string): string {
  return `${BROWSER_BOARD_PREFIX}${id}`
}

function savedSet(id: string): Set<string> {
  let set = savedFileIds.get(id)
  if (!set) {
    set = new Set()
    savedFileIds.set(id, set)
  }
  return set
}

function makeMeta(name: string, template = 'blank'): BoardMeta {
  const stamp = now()
  return {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80) || 'Untitled board',
    createdAt: stamp,
    updatedAt: stamp,
    starred: false,
    template,
  }
}

function normalizeMeta(raw: any): BoardMeta | null {
  if (!raw || typeof raw.id !== 'string' || !raw.id) return null
  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : 'Untitled board',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now(),
    starred: Boolean(raw.starred),
    template: typeof raw.template === 'string' ? raw.template : 'blank',
  }
}

function normalizeIndex(raw: any): BoardIndex | null {
  if (!raw || !Array.isArray(raw.boards)) return null
  const boards = raw.boards
    .map(normalizeMeta)
    .filter((board: BoardMeta | null): board is BoardMeta => Boolean(board))
  if (!boards.length) return null
  const activeBoardId = boards.some((board: BoardMeta) => board.id === raw.activeBoardId)
    ? raw.activeBoardId
    : boards[0].id
  return { version: 1, boards, activeBoardId }
}

function browserStorageError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new Error('Browser storage is full. Delete a board or use the desktop app for larger boards.')
  }
  return error instanceof Error ? error : new Error(String(error))
}

function persistBrowserIndex(index: BoardIndex) {
  try {
    localStorage.setItem(BROWSER_INDEX_KEY, JSON.stringify(index))
  } catch (error) {
    throw browserStorageError(error)
  }
}

function readBrowserIndex(): BoardIndex | null {
  try {
    const raw = localStorage.getItem(BROWSER_INDEX_KEY)
    return raw ? normalizeIndex(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeBrowserScene(id: string, scene: SceneData) {
  const payload = {
    type: 'excalidraw',
    version: 2,
    source: 'canvas-app',
    elements: scene.elements,
    appState: scene.appState,
    files: scene.files,
  }
  try {
    localStorage.setItem(boardKey(id), JSON.stringify(payload))
  } catch (error) {
    throw browserStorageError(error)
  }
}

function readBrowserScene(id: string): SceneData {
  try {
    const raw = localStorage.getItem(boardKey(id))
    return raw ? normalizeScene(JSON.parse(raw)) : blankScene()
  } catch {
    return blankScene()
  }
}

async function getRoot(): Promise<string> {
  const root = await appDataDir()
  if (!(await exists(root))) await mkdir(root, { recursive: true })
  return root
}

async function getBoardPaths(id: string) {
  const root = await getRoot()
  const boardsDir = await join(root, BOARDS_DIR)
  if (!(await exists(boardsDir))) await mkdir(boardsDir, { recursive: true })
  const dir = await join(boardsDir, id)
  if (!(await exists(dir))) await mkdir(dir, { recursive: true })
  const assetsDir = await join(dir, ASSETS_DIR)
  if (!(await exists(assetsDir))) await mkdir(assetsDir, { recursive: true })
  return {
    dir,
    boardPath: await join(dir, BOARD_FILE),
    assetsDir,
  }
}

async function persistIndex(index: BoardIndex) {
  cache = index
  if (isDesktop()) {
    const root = await getRoot()
    await writeTextFile(await join(root, INDEX_FILE), JSON.stringify(index))
  } else {
    persistBrowserIndex(index)
  }
}

async function writeTauriFiles(id: string, assetsDir: string, files: BinaryFiles) {
  const saved = savedSet(id)
  for (const [fileId, file] of Object.entries(files || {})) {
    if (!file?.dataURL || saved.has(fileId)) continue
    const { bytes, mime } = dataUrlToBytes(file.dataURL)
    const ext = extFromMime(file.mimeType || mime)
    await writeFile(await join(assetsDir, `${fileId}.${ext}`), bytes)
    saved.add(fileId)
  }
}

async function writeTauriBoard(boardPath: string, scene: SceneData) {
  const payload = {
    type: 'excalidraw',
    version: 2,
    source: 'canvas-app',
    elements: scene.elements,
    appState: scene.appState,
    files: {},
  }
  await writeTextFile(boardPath, JSON.stringify(payload))
}

async function readTauriScene(id: string): Promise<SceneData> {
  const { boardPath, assetsDir } = await getBoardPaths(id)
  let scene = blankScene()
  if (await exists(boardPath)) {
    try {
      scene = normalizeScene(JSON.parse(await readTextFile(boardPath)))
    } catch (error) {
      console.warn('Could not parse board file:', error)
    }
  }

  const files: BinaryFiles = {}
  const saved = savedSet(id)
  if (await exists(assetsDir)) {
    const entries = await readDir(assetsDir)
    for (const entry of entries) {
      if (!entry.isFile || !entry.name) continue
      const dot = entry.name.lastIndexOf('.')
      const fileId = dot > 0 ? entry.name.slice(0, dot) : entry.name
      const ext = dot > 0 ? entry.name.slice(dot + 1) : ''
      const mime = mimeFromExt(ext)
      const bytes = await readFile(await join(assetsDir, entry.name))
      files[fileId] = {
        id: fileId as any,
        dataURL: bytesToDataUrl(bytes, mime) as any,
        mimeType: mime as any,
        created: now(),
        lastRetrieved: now(),
      }
      saved.add(fileId)
    }
  }

  for (const [fileId, file] of Object.entries(scene.files || {})) {
    if (!files[fileId] && file?.dataURL) files[fileId] = file
  }

  return {
    elements: scene.elements,
    appState: scene.appState,
    files,
  }
}

async function writeTauriScene(id: string, scene: SceneData) {
  const { boardPath, assetsDir } = await getBoardPaths(id)
  await writeTauriFiles(id, assetsDir, scene.files)
  await writeTauriBoard(boardPath, scene)
}

async function writeScene(id: string, scene: SceneData) {
  if (isDesktop()) {
    await writeTauriScene(id, scene)
  } else {
    writeBrowserScene(id, scene)
  }
}

async function removeScene(id: string) {
  savedFileIds.delete(id)
  if (isDesktop()) {
    const { dir } = await getBoardPaths(id)
    if (await exists(dir)) await remove(dir, { recursive: true })
  } else {
    localStorage.removeItem(boardKey(id))
  }
}

async function migrateLegacyOrCreate(root: string): Promise<BoardIndex> {
  const meta = makeMeta('My board')
  const { boardPath, assetsDir } = await getBoardPaths(meta.id)
  let scene = blankScene()

  const legacyPath = await join(root, LEGACY_BOARD_FILE)
  if (await exists(legacyPath)) {
    try {
      scene = normalizeScene(JSON.parse(await readTextFile(legacyPath)))
      await writeTauriFiles(meta.id, assetsDir, scene.files)
    } catch (error) {
      console.warn('Could not migrate legacy board:', error)
    }
  }

  const legacyAssets = await join(root, LEGACY_ASSETS_DIR)
  if (await exists(legacyAssets)) {
    const saved = savedSet(meta.id)
    for (const entry of await readDir(legacyAssets)) {
      if (!entry.isFile || !entry.name) continue
      const dot = entry.name.lastIndexOf('.')
      const fileId = dot > 0 ? entry.name.slice(0, dot) : entry.name
      if (saved.has(fileId)) continue
      const bytes = await readFile(await join(legacyAssets, entry.name))
      await writeFile(await join(assetsDir, entry.name), bytes)
      saved.add(fileId)
    }
  }

  await writeTauriBoard(boardPath, scene)
  const index: BoardIndex = { version: 1, boards: [meta], activeBoardId: meta.id }
  await writeTextFile(await join(root, INDEX_FILE), JSON.stringify(index))
  return index
}

export async function initStorage(): Promise<BoardIndex> {
  if (cache) return cache
  if (isDesktop()) {
    const root = await getRoot()
    const indexPath = await join(root, INDEX_FILE)
    if (await exists(indexPath)) {
      try {
        const index = normalizeIndex(JSON.parse(await readTextFile(indexPath)))
        if (index) {
          cache = index
          return index
        }
      } catch (error) {
        console.warn('Could not read board index:', error)
      }
    }
    cache = await migrateLegacyOrCreate(root)
    return cache
  }

  let index = readBrowserIndex()
  if (!index) {
    const meta = makeMeta('My board')
    const scene = blankScene()
    writeBrowserScene(meta.id, scene)
    index = { version: 1, boards: [meta], activeBoardId: meta.id }
    persistBrowserIndex(index)
  }
  cache = index
  return index
}

export async function readBoard(id: string): Promise<SceneData> {
  await initStorage()
  if (isDesktop()) return readTauriScene(id)
  return readBrowserScene(id)
}

export async function saveBoard(id: string, scene: SceneData): Promise<BoardMeta> {
  const index = await initStorage()
  const meta = index.boards.find((board) => board.id === id)
  if (!meta) throw new Error('Board not found')

  const payload: SceneData = {
    elements: scene.elements,
    appState: cleanAppState(scene.appState),
    files: scene.files,
  }
  await writeScene(id, payload)

  const updated: BoardMeta = { ...meta, updatedAt: now() }
  await persistIndex({
    ...index,
    boards: index.boards.map((board) => (board.id === id ? updated : board)),
  })
  return updated
}

export async function setActiveBoard(id: string): Promise<BoardIndex> {
  const index = await initStorage()
  if (index.activeBoardId === id) return index
  const next: BoardIndex = { ...index, activeBoardId: id }
  await persistIndex(next)
  return next
}

export async function createBoard(input: {
  name: string
  template?: string
  scene: SceneData
}): Promise<{ index: BoardIndex; board: BoardMeta }> {
  const index = await initStorage()
  const board = makeMeta(input.name, input.template ?? 'blank')
  await writeScene(board.id, input.scene)
  const next: BoardIndex = {
    version: 1,
    boards: [board, ...index.boards],
    activeBoardId: board.id,
  }
  await persistIndex(next)
  return { index: next, board }
}

export async function duplicateBoard(id: string, name?: string): Promise<{ index: BoardIndex; board: BoardMeta }> {
  const index = await initStorage()
  const source = index.boards.find((board) => board.id === id)
  if (!source) throw new Error('Board not found')
  const scene = await readBoard(id)
  const board = makeMeta(name || `${source.name} copy`, source.template)
  await writeScene(board.id, scene)
  const next: BoardIndex = {
    version: 1,
    boards: [board, ...index.boards],
    activeBoardId: board.id,
  }
  await persistIndex(next)
  return { index: next, board }
}

export async function renameBoard(id: string, name: string): Promise<BoardMeta> {
  const index = await initStorage()
  const meta = index.boards.find((board) => board.id === id)
  if (!meta) throw new Error('Board not found')
  const updated: BoardMeta = {
    ...meta,
    name: name.trim().slice(0, 80) || 'Untitled board',
    updatedAt: now(),
  }
  await persistIndex({
    ...index,
    boards: index.boards.map((board) => (board.id === id ? updated : board)),
  })
  return updated
}

export async function setBoardStarred(id: string, starred: boolean): Promise<BoardMeta> {
  const index = await initStorage()
  const meta = index.boards.find((board) => board.id === id)
  if (!meta) throw new Error('Board not found')
  const updated: BoardMeta = { ...meta, starred }
  await persistIndex({
    ...index,
    boards: index.boards.map((board) => (board.id === id ? updated : board)),
  })
  return updated
}

export async function deleteBoard(id: string): Promise<BoardIndex> {
  const index = await initStorage()
  await removeScene(id)

  let boards = index.boards.filter((board) => board.id !== id)
  if (!boards.length) {
    const replacement = makeMeta('My board')
    await writeScene(replacement.id, blankScene())
    boards = [replacement]
  }
  const activeBoardId = boards.some((board) => board.id === index.activeBoardId)
    ? index.activeBoardId
    : boards[0].id
  const next: BoardIndex = { version: 1, boards, activeBoardId }
  await persistIndex(next)
  return next
}

export function isDesktopApp(): boolean {
  return isDesktop()
}

export async function getStorageLocation(): Promise<string> {
  if (!isDesktop()) return 'Browser local storage'
  return appDataDir()
}
