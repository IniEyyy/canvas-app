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
import type {
  BoardIndex,
  BoardMeta,
  BoardSearchHit,
  BoardSnapshot,
  SceneData,
  SnapshotReason,
  WorkspaceBackup,
} from './types'
import { blankScene, cleanAppState, normalizeScene } from './scene'
import { bytesToDataUrl, dataUrlToBytes, extFromMime, mimeFromExt } from './utils/dataUrl'

const INDEX_FILE = 'boards.json'
const BOARDS_DIR = 'boards'
const BOARD_FILE = 'board.json'
const ASSETS_DIR = 'assets'
const SNAPSHOTS_DIR = 'snapshots'
const LEGACY_BOARD_FILE = 'board.json'
const LEGACY_ASSETS_DIR = 'assets'
const BROWSER_INDEX_KEY = 'canvas-app:index'
const BROWSER_BOARD_PREFIX = 'canvas-app:board:'
const BROWSER_SNAPSHOT_PREFIX = 'canvas-app:snapshots:'
const SEARCH_MIN_LENGTH = 2
const SEARCH_HITS_PER_BOARD = 3
const SEARCH_HITS_TOTAL = 40
const AUTO_SNAPSHOT_INTERVAL = 5 * 60 * 1000
const MAX_SNAPSHOTS = 12
const MAX_BROWSER_SNAPSHOTS = 6
const MAX_TAGS = 8
const MAX_TAG_LENGTH = 24

type IndexedText = {
  elementId: string
  kind: BoardSearchHit['kind']
  text: string
}

type StoredSnapshot = {
  version: 1
  id: string
  createdAt: number
  reason: SnapshotReason
  elementCount: number
  scene: {
    elements: readonly any[]
    appState: Record<string, any>
    files?: BinaryFiles
  }
}

let cache: BoardIndex | null = null
const savedFileIds = new Map<string, Set<string>>()
const textCache = new Map<string, { updatedAt: number; entries: IndexedText[] }>()
const lastSnapshotAt = new Map<string, number>()

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

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const tags: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string') continue
    const tag = value.replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
    if (tags.length >= MAX_TAGS) break
  }
  return tags
}

function makeMeta(name: string, template = 'blank', tags: string[] = []): BoardMeta {
  const stamp = now()
  return {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80) || 'Untitled board',
    createdAt: stamp,
    updatedAt: stamp,
    starred: false,
    template,
    tags: normalizeTags(tags),
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
    tags: normalizeTags(raw.tags),
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

function textEntriesOf(element: any): Array<{ kind: BoardSearchHit['kind']; text: string }> {
  if (!element) return []
  const entries: Array<{ kind: BoardSearchHit['kind']; text: string }> = []
  if (typeof element.text === 'string' && element.text.trim()) {
    entries.push({ kind: 'text', text: element.text })
  }
  const label = element.label?.text
  if (typeof label === 'string' && label.trim()) {
    entries.push({ kind: 'label', text: label })
  }
  if (element.type === 'frame' && typeof element.name === 'string' && element.name.trim()) {
    entries.push({ kind: 'frame', text: element.name })
  }
  return entries
}

function snippetAround(text: string, query: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const index = flat.toLowerCase().indexOf(query.toLowerCase())
  if (index < 0) return flat.slice(0, 120)
  const start = Math.max(0, index - 36)
  const end = Math.min(flat.length, index + query.length + 64)
  return `${start ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`
}

async function readStoredScene(id: string): Promise<any | null> {
  if (isDesktop()) {
    const root = await getRoot()
    const path = await join(root, BOARDS_DIR, id, BOARD_FILE)
    if (!(await exists(path))) return null
    try {
      return JSON.parse(await readTextFile(path))
    } catch {
      return null
    }
  }

  try {
    const raw = localStorage.getItem(boardKey(id))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function getBoardTextEntries(board: BoardMeta): Promise<IndexedText[]> {
  const cached = textCache.get(board.id)
  if (cached?.updatedAt === board.updatedAt) return cached.entries

  const scene = await readStoredScene(board.id)
  const entries: IndexedText[] = []
  const elements = Array.isArray(scene?.elements) ? scene.elements : []
  for (const element of elements) {
    if (!element || element.isDeleted || typeof element.id !== 'string') continue
    for (const entry of textEntriesOf(element)) {
      entries.push({ elementId: element.id, ...entry })
    }
  }
  textCache.set(board.id, { updatedAt: board.updatedAt, entries })
  return entries
}

function nextAvailableName(base: string, boards: BoardMeta[]): string {
  const cleaned = base.trim().slice(0, 80) || 'Restored board'
  const names = new Set(boards.map((board) => board.name.toLowerCase()))
  if (!names.has(cleaned.toLowerCase())) return cleaned
  let counter = 2
  while (names.has(`${cleaned} ${counter}`.toLowerCase())) counter += 1
  return `${cleaned} ${counter}`
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
  textCache.delete(id)
  if (isDesktop()) {
    const { dir } = await getBoardPaths(id)
    if (await exists(dir)) await remove(dir, { recursive: true })
  } else {
    localStorage.removeItem(boardKey(id))
  }
}

function parseSnapshotName(name: string): BoardSnapshot | null {
  const match = /^(\d+)-(auto|manual|before-restore|before-layout)-(\d+)-([0-9a-f-]+)\.json$/.exec(name)
  if (!match) return null
  return {
    id: match[4],
    createdAt: Number(match[1]),
    reason: match[2] as SnapshotReason,
    elementCount: Number(match[3]),
  }
}

function isStoredSnapshot(raw: any): raw is StoredSnapshot {
  return Boolean(
    raw &&
      raw.version === 1 &&
      typeof raw.id === 'string' &&
      typeof raw.createdAt === 'number' &&
      Array.isArray(raw.scene?.elements),
  )
}

function readBrowserSnapshots(boardId: string): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(`${BROWSER_SNAPSHOT_PREFIX}${boardId}`)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter(isStoredSnapshot) : []
  } catch {
    return []
  }
}

async function getSnapshotsDir(boardId: string): Promise<string> {
  const { dir } = await getBoardPaths(boardId)
  const snapshotsDir = await join(dir, SNAPSHOTS_DIR)
  if (!(await exists(snapshotsDir))) await mkdir(snapshotsDir, { recursive: true })
  return snapshotsDir
}

async function pruneDesktopSnapshots(dir: string) {
  const entries = await readDir(dir)
  const snapshots: Array<{ name: string; createdAt: number }> = []
  for (const entry of entries) {
    if (!entry.isFile || !entry.name) continue
    const meta = parseSnapshotName(entry.name)
    if (meta) snapshots.push({ name: entry.name, createdAt: meta.createdAt })
  }
  snapshots.sort((a, b) => b.createdAt - a.createdAt)
  for (const item of snapshots.slice(MAX_SNAPSHOTS)) {
    await remove(await join(dir, item.name))
  }
}

async function writeSnapshot(
  boardId: string,
  scene: SceneData,
  reason: SnapshotReason,
  includeFiles: boolean,
): Promise<BoardSnapshot> {
  const id = crypto.randomUUID()
  const createdAt = now()
  const elementCount = scene.elements.filter((element: any) => element && !element.isDeleted).length
  const payload: StoredSnapshot = {
    version: 1,
    id,
    createdAt,
    reason,
    elementCount,
    scene: {
      elements: scene.elements,
      appState: cleanAppState(scene.appState),
      files: includeFiles ? scene.files : {},
    },
  }

  if (isDesktop()) {
    const dir = await getSnapshotsDir(boardId)
    const name = `${createdAt}-${reason}-${elementCount}-${id}.json`
    await writeTextFile(await join(dir, name), JSON.stringify(payload))
    await pruneDesktopSnapshots(dir)
  } else {
    const key = `${BROWSER_SNAPSHOT_PREFIX}${boardId}`
    let list = [payload, ...readBrowserSnapshots(boardId)].slice(0, MAX_BROWSER_SNAPSHOTS)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        localStorage.setItem(key, JSON.stringify(list))
        break
      } catch (error) {
        const quota = error instanceof DOMException && error.name === 'QuotaExceededError'
        if (!quota || attempt === 2 || list.length <= 1) {
          console.warn('Could not store a version snapshot:', error)
          break
        }
        list = list.slice(0, Math.max(1, list.length - 2))
      }
    }
  }

  lastSnapshotAt.set(boardId, createdAt)
  return { id, createdAt, reason, elementCount }
}

async function maybeAutoSnapshot(boardId: string, scene: SceneData) {
  if (!lastSnapshotAt.has(boardId)) {
    const existing = await listBoardSnapshots(boardId).catch(() => [])
    lastSnapshotAt.set(boardId, existing[0]?.createdAt ?? 0)
  }
  if (now() - (lastSnapshotAt.get(boardId) ?? 0) < AUTO_SNAPSHOT_INTERVAL) return
  if (!scene.elements.some((element: any) => element && !element.isDeleted)) return
  try {
    await writeSnapshot(boardId, scene, 'auto', !isDesktop())
  } catch (error) {
    console.warn('Could not create an automatic snapshot:', error)
  }
}

async function readSnapshotPayload(boardId: string, snapshotId: string): Promise<StoredSnapshot | null> {
  if (isDesktop()) {
    const dir = await getSnapshotsDir(boardId)
    const entry = (await readDir(dir)).find(
      (item) => item.isFile && item.name?.endsWith(`-${snapshotId}.json`),
    )
    if (!entry?.name) return null
    try {
      const parsed = JSON.parse(await readTextFile(await join(dir, entry.name)))
      return isStoredSnapshot(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return readBrowserSnapshots(boardId).find((snapshot) => snapshot.id === snapshotId) ?? null
}

export async function listBoardSnapshots(boardId: string): Promise<BoardSnapshot[]> {
  await initStorage()
  if (isDesktop()) {
    const dir = await getSnapshotsDir(boardId)
    return (await readDir(dir))
      .map((entry) => (entry.isFile && entry.name ? parseSnapshotName(entry.name) : null))
      .filter((snapshot): snapshot is BoardSnapshot => Boolean(snapshot))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SNAPSHOTS)
  }
  return readBrowserSnapshots(boardId)
    .slice(0, MAX_BROWSER_SNAPSHOTS)
    .map(({ id, createdAt, reason, elementCount }) => ({ id, createdAt, reason, elementCount }))
}

export async function createBoardSnapshot(
  boardId: string,
  reason: SnapshotReason = 'manual',
): Promise<BoardSnapshot> {
  await initStorage()
  const scene = await readBoard(boardId)
  return writeSnapshot(boardId, scene, reason, !isDesktop())
}

export async function restoreBoardSnapshot(
  boardId: string,
  snapshotId: string,
): Promise<{ scene: SceneData; index: BoardIndex; meta: BoardMeta }> {
  await initStorage()
  const stored = await readSnapshotPayload(boardId, snapshotId)
  if (!stored) throw new Error('That version is no longer available.')

  const current = await readBoard(boardId)
  if (current.elements.some((element: any) => element && !element.isDeleted)) {
    await writeSnapshot(boardId, current, 'before-restore', !isDesktop())
  }

  await writeScene(boardId, {
    elements: stored.scene.elements,
    appState: cleanAppState(stored.scene.appState ?? {}),
    files: (stored.scene.files ?? {}) as BinaryFiles,
  })
  textCache.delete(boardId)

  const index = await initStorage()
  const meta = index.boards.find((board) => board.id === boardId)
  if (!meta) throw new Error('Board not found')
  const updated: BoardMeta = { ...meta, updatedAt: now() }
  const next: BoardIndex = {
    ...index,
    boards: index.boards.map((board) => (board.id === boardId ? updated : board)),
  }
  await persistIndex(next)

  return { scene: await readBoard(boardId), index: next, meta: updated }
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
  textCache.delete(id)

  const updated: BoardMeta = { ...meta, updatedAt: now() }
  await persistIndex({
    ...index,
    boards: index.boards.map((board) => (board.id === id ? updated : board)),
  })
  await maybeAutoSnapshot(id, payload)
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
  tags?: string[]
}): Promise<{ index: BoardIndex; board: BoardMeta }> {
  const index = await initStorage()
  const board = makeMeta(input.name, input.template ?? 'blank', input.tags)
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
  const board = makeMeta(name || `${source.name} copy`, source.template, source.tags)
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

export async function setBoardTags(id: string, tags: string[]): Promise<BoardMeta> {
  const index = await initStorage()
  const meta = index.boards.find((board) => board.id === id)
  if (!meta) throw new Error('Board not found')
  const updated: BoardMeta = { ...meta, tags: normalizeTags(tags), updatedAt: now() }
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

export async function searchBoardContents(query: string): Promise<BoardSearchHit[]> {
  const normalized = query.trim().toLowerCase()
  if (normalized.length < SEARCH_MIN_LENGTH) return []

  const index = await initStorage()
  const boards = [...index.boards].sort((a, b) => b.updatedAt - a.updatedAt)
  const hits: BoardSearchHit[] = []

  for (const board of boards) {
    const entries = await getBoardTextEntries(board)
    let boardHits = 0
    for (const entry of entries) {
      if (!entry.text.toLowerCase().includes(normalized)) continue
      hits.push({
        boardId: board.id,
        boardName: board.name,
        elementId: entry.elementId,
        kind: entry.kind,
        snippet: snippetAround(entry.text, normalized),
      })
      boardHits += 1
      if (boardHits >= SEARCH_HITS_PER_BOARD) break
    }
    if (hits.length >= SEARCH_HITS_TOTAL) break
  }

  return hits.slice(0, SEARCH_HITS_TOTAL)
}

export async function createWorkspaceBackup(): Promise<WorkspaceBackup> {
  const index = await initStorage()
  const boards: WorkspaceBackup['boards'] = []
  for (const meta of index.boards) {
    boards.push({ meta, scene: await readBoard(meta.id) })
  }
  return {
    app: 'canvas-app',
    version: 1,
    exportedAt: Date.now(),
    boards,
  }
}

export async function restoreWorkspaceBackup(
  raw: unknown,
): Promise<{ index: BoardIndex; count: number }> {
  const candidate = raw as Partial<WorkspaceBackup> | null
  if (!candidate || candidate.app !== 'canvas-app' || candidate.version !== 1 || !Array.isArray(candidate.boards)) {
    throw new Error('This is not a Canvas workspace backup.')
  }

  let index = await initStorage()
  let count = 0
  for (const entry of candidate.boards) {
    if (!entry || typeof entry !== 'object') continue
    const meta = (entry as any).meta ?? {}
    const baseName = typeof meta.name === 'string' && meta.name.trim() ? meta.name : 'Restored board'
    const template = typeof meta.template === 'string' ? meta.template : 'blank'
    const scene = normalizeScene((entry as any).scene)
    const result = await createBoard({
      name: nextAvailableName(baseName, index.boards),
      template,
      scene,
      tags: normalizeTags(meta.tags),
    })
    index = result.index
    count += 1
  }

  if (!count) throw new Error('This backup does not contain any boards.')
  return { index, count }
}

export function isDesktopApp(): boolean {
  return isDesktop()
}

export async function getStorageLocation(): Promise<string> {
  if (!isDesktop()) return 'Browser local storage'
  return appDataDir()
}
