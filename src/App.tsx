import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import './excalidraw-overrides.css'
import { useCallback, useRef, useState, useEffect } from 'react'
import type { ExcalidrawImperativeAPI, BinaryFiles } from '@excalidraw/excalidraw/types'
import {
  writeTextFile, readTextFile, writeFile, readFile,
  exists, mkdir, readDir,
} from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import { dataUrlToBytes, bytesToDataUrl, extFromMime, isUrl } from './utils/dataUrl'

const BOARD_FILE = 'board.json'
const ASSETS_DIR = 'assets'
const DEBOUNCE_MS = 800

export default function App() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFileIds = useRef<Set<string>>(new Set())
  const [initialData, setInitialData] = useState<any>(null)

  const getPaths = useCallback(async () => {
    const dir = await appDataDir()
    if (!(await exists(dir))) await mkdir(dir, { recursive: true })
    const assetsDir = await join(dir, ASSETS_DIR)
    if (!(await exists(assetsDir))) await mkdir(assetsDir, { recursive: true })
    return { boardPath: await join(dir, BOARD_FILE), assetsDir }
  }, [])

  // Load board + reconstruct files from assets/ folder
  useEffect(() => {
    (async () => {
      try {
        const { boardPath, assetsDir } = await getPaths()
        if (await exists(boardPath)) {
          const raw = await readTextFile(boardPath)
          const data = JSON.parse(raw)
          data.appState = { currentItemRoughness: 0, ...data.appState }

          const files: BinaryFiles = {}
          const entries = await readDir(assetsDir)
          for (const entry of entries) {
            if (!entry.isFile) continue
            const fileId = entry.name!.split('.')[0]
            const bytes = await readFile(await join(assetsDir, entry.name!))
            const ext = entry.name!.split('.').pop() || ''
            const mimeGuess = ext === 'png' ? 'image/png'
              : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
              : ext === 'gif' ? 'image/gif'
              : ext === 'svg' ? 'image/svg+xml'
              : ext === 'webp' ? 'image/webp'
              : 'application/octet-stream'
            files[fileId] = {
              id: fileId as any,
              dataURL: bytesToDataUrl(bytes, mimeGuess) as any,
              mimeType: mimeGuess as any,
              created: Date.now(),
              lastRetrieved: Date.now(),
            }
            savedFileIds.current.add(fileId)
          }
          data.files = files
          setInitialData(data)
        } else {
          setInitialData({ elements: [], appState: { currentItemRoughness: 0 }, files: {} })
        }
      } catch (e) {
        console.error('Failed to load board:', e)
        setInitialData({ elements: [], appState: { currentItemRoughness: 0 }, files: {} })
      }
    })()
  }, [getPaths])

  const saveBoard = useCallback(async (elements: readonly any[], appState: any, files: BinaryFiles) => {
    const { boardPath, assetsDir } = await getPaths()

    // Persist board.json WITHOUT embedding dataURLs
    const payload = {
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
        currentItemRoughness: appState.currentItemRoughness,
      },
    }
    await writeTextFile(boardPath, JSON.stringify(payload))

    // Write any new binary files to assets/ folder (skip already-saved ones)
    for (const fileId of Object.keys(files)) {
      if (savedFileIds.current.has(fileId)) continue
      const file = files[fileId]
      const { bytes, mime } = dataUrlToBytes(file.dataURL as string)
      const ext = extFromMime(mime)
      const path = await join(assetsDir, `${fileId}.${ext}`)
      await writeFile(path, bytes)
      savedFileIds.current.add(fileId)
    }
  }, [getPaths])

  const handleChange = useCallback((elements: readonly any[], appState: any, files: BinaryFiles) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveBoard(elements, appState, files), DEBOUNCE_MS)
  }, [saveBoard])

  // Auto-embed pasted URLs (link -> embeddable element)
  const handlePaste = useCallback((data: any) => {
  console.log('[paste] data:', data)
  const text = data.text?.trim()
  const hasFiles = data.files && data.files.length > 0
  const api = apiRef.current

  console.log('[paste] text:', text, 'isUrl:', text ? isUrl(text) : false, 'hasFiles:', hasFiles)

  if (text && isUrl(text) && !hasFiles && api) {
    const appState = api.getAppState()
    const centerX = -appState.scrollX + window.innerWidth / 2 / appState.zoom.value
    const centerY = -appState.scrollY + window.innerHeight / 2 / appState.zoom.value

    const newEls = convertToExcalidrawElements([
      {
        type: 'embeddable',
        x: centerX - 200,
        y: centerY - 150,
        width: 400,
        height: 300,
        link: text,
      } as any,
    ])

    console.log('[paste] created embeddable element:', newEls)

    api.updateScene({
      elements: [...api.getSceneElements(), ...newEls],
    })
    return false
  }
  return true
}, [])

  if (!initialData) return null

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Excalidraw
        excalidrawAPI={(api) => (apiRef.current = api)}
        initialData={initialData}
        onChange={handleChange}
        onPaste={handlePaste}
        validateEmbeddable={true}
      />
    </div>
  )
}