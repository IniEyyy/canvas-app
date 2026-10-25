import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
  convertToExcalidrawElements,
  loadFromBlob,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import './excalidraw-overrides.css'
import './App.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { BoardDrawer } from './components/BoardDrawer'
import { TemplatePicker } from './components/TemplatePicker'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PresentationBar, SavePill, ZenBar } from './components/Chrome'
import {
  BoardsIcon,
  CopyIcon,
  DownloadIcon,
  DuplicateIcon,
  FocusIcon,
  LogoMark,
  PlayIcon,
  SaveIcon,
  TemplateIcon,
  TrashIcon,
  UploadIcon,
} from './components/icons'
import {
  createBoard,
  deleteBoard as removeBoardFromStorage,
  duplicateBoard,
  getStorageLocation,
  initStorage,
  isDesktopApp,
  readBoard,
  renameBoard,
  saveBoard,
  setActiveBoard,
  setBoardStarred,
} from './storage'
import { normalizeScene, cleanAppState, toInitialData } from './scene'
import { getTemplate, prepareTemplateFonts, sceneForTemplate } from './templates'
import type { BoardIndex, BoardMeta, SaveState, ThemePreference } from './types'
import { pickFile } from './utils/files'
import { runExport, type ExportKind } from './utils/exportScene'
import { isUrl } from './utils/dataUrl'

const DEBOUNCE_MS = 800
const THEME_KEY = 'canvas-app:theme'

type PendingSave = {
  boardId: string
  elements: readonly any[]
  appState: any
  files: BinaryFiles
}

type PresentationState = {
  frames: any[]
  index: number
}

type PresentationMask = {
  left: number
  top: number
  width: number
  height: number
  background: string
}

function readThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // localStorage can be unavailable in hardened webviews
  }
  return 'system'
}

function uniqueBoardName(base: string, boards: BoardMeta[]): string {
  const names = new Set(boards.map((board) => board.name.toLowerCase()))
  if (!names.has(base.toLowerCase())) return base
  let counter = 2
  while (names.has(`${base} ${counter}`.toLowerCase())) counter += 1
  return `${base} ${counter}`
}

export default function App() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<PendingSave | null>(null)
  const boardRef = useRef<BoardMeta | null>(null)
  const writeChain = useRef<Promise<unknown>>(Promise.resolve())
  const lastQueuedRef = useRef<{
    elements: readonly any[]
    files: BinaryFiles
    appState: string
  } | null>(null)
  const fitOnOpenRef = useRef(false)
  const presentationRef = useRef<PresentationState | null>(null)

  const [boardIndex, setBoardIndex] = useState<BoardIndex | null>(null)
  const [board, setBoard] = useState<BoardMeta | null>(null)
  const [initialData, setInitialData] = useState<any>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BoardMeta | null>(null)
  const [presentation, setPresentation] = useState<PresentationState | null>(null)
  const [presentationMask, setPresentationMask] = useState<PresentationMask | null>(null)
  const [zen, setZen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [storagePath, setStoragePath] = useState('')
  const [themePref, setThemePref] = useState<ThemePreference>(readThemePreference)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  const resolvedTheme = themePref === 'system' ? (systemDark ? 'dark' : 'light') : themePref
  const desktop = isDesktopApp()

  const toast = useCallback((message: string) => {
    apiRef.current?.setToast({ message, duration: 3500, closable: true })
  }, [])

  const syncPresentationMask = useCallback(
    (scroll?: { scrollX: number; scrollY: number; zoom: number }) => {
      const api = apiRef.current
      const state = presentationRef.current
      const frame = state?.frames[state.index]
      if (!api || !state || !frame) {
        setPresentationMask(null)
        return
      }
      const appState = api.getAppState()
      const zoom = scroll?.zoom ?? appState.zoom.value
      const scrollX = scroll?.scrollX ?? appState.scrollX
      const scrollY = scroll?.scrollY ?? appState.scrollY
      setPresentationMask({
        left: (frame.x + scrollX) * zoom,
        top: (frame.y + scrollY) * zoom,
        width: frame.width * zoom,
        height: frame.height * zoom,
        // Excalidraw inverts the canvas bitmap in dark mode, so the raw
        // viewBackgroundColor (usually white) is not what the user sees.
        background: resolvedTheme === 'dark' ? '#121212' : appState.viewBackgroundColor,
      })
    },
    [resolvedTheme],
  )

  const fitScene = useCallback((api: ExcalidrawImperativeAPI) => {
    const elements = api.getSceneElements().filter((element) => !element.isDeleted)
    if (!elements.length) return
    const frames = elements
      .filter((element) => element.type === 'frame')
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x)
    const target = frames.length ? frames[0] : elements
    api.scrollToContent(target as any, { fitToContent: true, animate: false })
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    try {
      localStorage.setItem(THEME_KEY, themePref)
    } catch {
      // ignore storage failures for a UI preference
    }
  }, [resolvedTheme, themePref])

  useEffect(() => {
    if (!presentation) {
      setPresentationMask(null)
      return
    }
    syncPresentationMask()
    const onResize = () => syncPresentationMask()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [presentation, syncPresentationMask])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const index = await initStorage()
        const active = index.boards.find((item) => item.id === index.activeBoardId) ?? index.boards[0]
        const scene = await readBoard(active.id)
        const location = await getStorageLocation().catch(() => '')
        if (cancelled) return
        boardRef.current = active
        setBoardIndex(index)
        setBoard(active)
        setInitialData(toInitialData(scene))
        setStoragePath(location)
        setSaveState('saved')
      } catch (error) {
        console.error('Could not initialize boards:', error)
        if (!cancelled) setFatalError(error instanceof Error ? error.message : 'Could not open local storage.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!board) return
    const title = `${board.name} — Canvas`
    document.title = title
    if (isTauri()) {
      getCurrentWindow().setTitle(title).catch(() => undefined)
    }
  }, [board])

  const queueSave = useCallback((payload: PendingSave) => {
    const job = writeChain.current.then(async () => {
      const updated = await saveBoard(payload.boardId, {
        elements: payload.elements,
        appState: payload.appState,
        files: payload.files,
      })
      boardRef.current = boardRef.current?.id === updated.id ? updated : boardRef.current
      setBoardIndex((previous) =>
        previous
          ? { ...previous, boards: previous.boards.map((item) => (item.id === updated.id ? updated : item)) }
          : previous,
      )
      setBoard((previous) => (previous?.id === updated.id ? updated : previous))
      return updated
    })
    writeChain.current = job.catch(() => undefined)
    return job
  }, [])

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const payload = pendingRef.current
    if (!payload) return true
    pendingRef.current = null
    setSaveState('saving')
    try {
      await queueSave(payload)
      if (!pendingRef.current) setSaveState('saved')
      return true
    } catch (error) {
      console.error('Autosave failed:', error)
      if (!pendingRef.current) pendingRef.current = payload
      setSaveState('error')
      return false
    }
  }, [queueSave])

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: BinaryFiles) => {
      const current = boardRef.current
      if (!current) return
      const appStateSnapshot = JSON.stringify(cleanAppState(appState))
      const last = lastQueuedRef.current
      // Excalidraw emits onChange after any parent re-render, including saves.
      // Skip identical scenes so autosave cannot retrigger itself.
      if (last && last.elements === elements && last.files === files && last.appState === appStateSnapshot) {
        return
      }
      lastQueuedRef.current = { elements, files, appState: appStateSnapshot }
      pendingRef.current = { boardId: current.id, elements, appState, files }
      setSaveState('unsaved')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void flushSave()
      }, DEBOUNCE_MS)
    },
    [flushSave],
  )

  const saveNow = useCallback(async () => {
    const ok = await flushSave()
    toast(ok ? 'Board saved locally' : 'Could not save board — check the save status')
  }, [flushSave, toast])

  const openBoard = useCallback(
    async (id: string) => {
      if (!boardIndex) return
      if (boardRef.current?.id === id) {
        setDrawerOpen(false)
        return
      }
      const meta = boardIndex.boards.find((item) => item.id === id)
      if (!meta) return
      setBusy(true)
      try {
        await flushSave()
        const scene = await readBoard(id)
        const nextIndex = await setActiveBoard(id)
        boardRef.current = meta
        setBoard(meta)
        setBoardIndex(nextIndex)
        setInitialData(toInitialData(scene))
        setSaveState('saved')
        setDrawerOpen(false)
      } catch (error) {
        console.error('Could not open board:', error)
        toast('Could not open that board')
      } finally {
        setBusy(false)
      }
    },
    [boardIndex, flushSave, toast],
  )

  const createFromTemplate = useCallback(
    async (templateId: string) => {
      if (!boardIndex) return
      setBusy(true)
      try {
        await flushSave()
        await prepareTemplateFonts()
        const template = getTemplate(templateId)
        const scene = sceneForTemplate(templateId)
        const baseName = templateId === 'blank' ? 'Untitled board' : template.name
        const result = await createBoard({
          name: uniqueBoardName(baseName, boardIndex.boards),
          template: templateId,
          scene,
        })
        boardRef.current = result.board
        setBoardIndex(result.index)
        setBoard(result.board)
        fitOnOpenRef.current = true
        setInitialData(toInitialData(scene, true))
        setSaveState('saved')
        setTemplateOpen(false)
        setDrawerOpen(false)
        toast(`Created “${result.board.name}”`)
      } catch (error) {
        console.error('Could not create board:', error)
        toast('Could not create the board')
      } finally {
        setBusy(false)
      }
    },
    [boardIndex, flushSave, toast],
  )

  const duplicateCurrent = useCallback(
    async (id?: string) => {
      if (!boardIndex) return
      const sourceId = id ?? boardRef.current?.id
      if (!sourceId) return
      const source = boardIndex.boards.find((item) => item.id === sourceId)
      if (!source) return
      setBusy(true)
      try {
        await flushSave()
        const result = await duplicateBoard(
          sourceId,
          uniqueBoardName(`${source.name} copy`, boardIndex.boards),
        )
        const scene = await readBoard(result.board.id)
        boardRef.current = result.board
        setBoardIndex(result.index)
        setBoard(result.board)
        setInitialData(toInitialData(scene))
        setSaveState('saved')
        setDrawerOpen(false)
        toast(`Duplicated “${source.name}”`)
      } catch (error) {
        console.error('Could not duplicate board:', error)
        toast('Could not duplicate the board')
      } finally {
        setBusy(false)
      }
    },
    [boardIndex, flushSave, toast],
  )

  const handleRename = useCallback(
    async (id: string, name: string) => {
      try {
        const updated = await renameBoard(id, name)
        boardRef.current = boardRef.current?.id === id ? updated : boardRef.current
        setBoard((previous) => (previous?.id === id ? updated : previous))
        setBoardIndex((previous) =>
          previous
            ? { ...previous, boards: previous.boards.map((item) => (item.id === id ? updated : item)) }
            : previous,
        )
      } catch (error) {
        console.error('Could not rename board:', error)
        toast('Could not rename the board')
      }
    },
    [toast],
  )

  const handleStar = useCallback(
    async (id: string, starred: boolean) => {
      try {
        const updated = await setBoardStarred(id, starred)
        boardRef.current = boardRef.current?.id === id ? updated : boardRef.current
        setBoard((previous) => (previous?.id === id ? updated : previous))
        setBoardIndex((previous) =>
          previous
            ? { ...previous, boards: previous.boards.map((item) => (item.id === id ? updated : item)) }
            : previous,
        )
      } catch (error) {
        console.error('Could not update board:', error)
        toast('Could not update the board')
      }
    },
    [toast],
  )

  const handleDelete = useCallback(async () => {
    const target = deleteTarget
    if (!target || !boardIndex) return
    setBusy(true)
    const deletingActive = boardRef.current?.id === target.id
    try {
      if (deletingActive) {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current)
          saveTimer.current = null
        }
        pendingRef.current = null
      } else {
        await flushSave()
      }
      await writeChain.current
      const nextIndex = await removeBoardFromStorage(target.id)
      const nextActive =
        nextIndex.boards.find((item) => item.id === nextIndex.activeBoardId) ?? nextIndex.boards[0]
      if (deletingActive) {
        const scene = await readBoard(nextActive.id)
        boardRef.current = nextActive
        setBoard(nextActive)
        setInitialData(toInitialData(scene))
        setSaveState('saved')
      }
      setBoardIndex(nextIndex)
      setDeleteTarget(null)
      toast(`Deleted “${target.name}”`)
    } catch (error) {
      console.error('Could not delete board:', error)
      toast('Could not delete the board')
    } finally {
      setBusy(false)
    }
  }, [boardIndex, deleteTarget, flushSave, toast])

  const importScene = useCallback(async () => {
    const file = await pickFile('.excalidraw,.json,application/json')
    if (!file || !boardIndex) return
    setBusy(true)
    try {
      await flushSave()
      const data = await loadFromBlob(file, null, null)
      const scene = normalizeScene(data)
      const baseName = file.name.replace(/\.(excalidraw|json)$/i, '') || 'Imported board'
      const result = await createBoard({
        name: uniqueBoardName(baseName, boardIndex.boards),
        template: 'blank',
        scene,
      })
      boardRef.current = result.board
      setBoardIndex(result.index)
      setBoard(result.board)
      fitOnOpenRef.current = true
      setInitialData(toInitialData(scene, true))
      setSaveState('saved')
      setDrawerOpen(false)
      toast(`Imported “${result.board.name}”`)
    } catch (error) {
      console.error('Import failed:', error)
      toast('That file could not be imported. Use an .excalidraw or Excalidraw JSON file.')
    } finally {
      setBusy(false)
    }
  }, [boardIndex, flushSave, toast])

  const handleExport = useCallback(
    async (kind: ExportKind) => {
      const api = apiRef.current
      const current = boardRef.current
      if (!api || !current) return
      try {
        const result = await runExport(api, kind, current.name)
        if (result === 'copied') toast('PNG copied to the clipboard')
        if (result === 'saved') toast('Export saved')
      } catch (error) {
        console.error('Export failed:', error)
        toast(error instanceof Error ? error.message : 'Export failed')
      }
    },
    [toast],
  )

  const goToSlide = useCallback(
    (target: number) => {
      if (!presentation || !presentation.frames.length) return
      const next = Math.max(0, Math.min(presentation.frames.length - 1, target))
      if (next === presentation.index) return
      const nextState = { ...presentation, index: next }
      presentationRef.current = nextState
      setPresentation(nextState)
      apiRef.current?.scrollToContent(presentation.frames[next], {
        fitToContent: true,
        animate: true,
        duration: 320,
      })
    },
    [presentation],
  )

  const beginPresentation = useCallback((frames: any[], api: ExcalidrawImperativeAPI) => {
    const state = { frames, index: 0 }
    presentationRef.current = state
    setPresentation(state)
    setZen(false)
    setDrawerOpen(false)
    setTemplateOpen(false)
    window.setTimeout(() => {
      api.scrollToContent(frames[0], {
        fitToContent: true,
        animate: true,
        duration: 380,
      })
    }, 90)
  }, [])

  const startPresentation = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    const elements = api.getSceneElements().filter((element) => !element.isDeleted)
    if (!elements.length) {
      toast('Nothing to present yet — draw something or start from the Slide deck template')
      return
    }
    const frames = elements
      .filter((element) => element.type === 'frame')
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x)
    if (!frames.length) {
      toast('Add a frame with the Frame tool (F) to present a board, or start from the Slide deck template')
      return
    }
    beginPresentation(frames, api)
  }, [beginPresentation, toast])

  const stopPresentation = useCallback(() => {
    presentationRef.current = null
    setPresentation(null)
    setPresentationMask(null)
  }, [])

  const toggleZen = useCallback(() => {
    setZen((previous) => !previous)
    setDrawerOpen(false)
  }, [])

  const handlePaste = useCallback((data: any) => {
    const text = data.text?.trim()
    const hasFiles = data.files && data.files.length > 0
    const api = apiRef.current
    if (text && isUrl(text) && !hasFiles && api) {
      const appState = api.getAppState()
      const centerX = -appState.scrollX + window.innerWidth / 2 / appState.zoom.value
      const centerY = -appState.scrollY + window.innerHeight / 2 / appState.zoom.value
      const newElements = convertToExcalidrawElements([
        {
          type: 'embeddable',
          x: centerX - 200,
          y: centerY - 150,
          width: 400,
          height: 300,
          link: text,
        } as any,
      ])
      api.updateScene({
        elements: [...api.getSceneElements(), ...newElements],
      })
      return false
    }
    return true
  }, [])

  const handleThemeChange = useCallback((next: ThemePreference) => {
    setThemePref(next)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const target = event.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox')

      if (presentation) {
        if (event.key === 'Escape') {
          event.preventDefault()
          stopPresentation()
          return
        }
        if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
          event.preventDefault()
          goToSlide(presentation.index + 1)
          return
        }
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
          event.preventDefault()
          goToSlide(presentation.index - 1)
          return
        }
        return
      }

      if (mod && key === 's') {
        event.preventDefault()
        void saveNow()
        return
      }
      if (mod && event.altKey && key === 'n' && !typing) {
        event.preventDefault()
        setDrawerOpen(false)
        setTemplateOpen(true)
        return
      }
      if (mod && !event.shiftKey && key === 'b' && !typing) {
        event.preventDefault()
        setDrawerOpen((previous) => !previous)
        return
      }
      if (event.key === 'Escape') {
        if (typing) return
        if (templateOpen) {
          setTemplateOpen(false)
          return
        }
        if (deleteTarget) {
          setDeleteTarget(null)
          return
        }
        if (zen) {
          setZen(false)
          return
        }
        if (drawerOpen) setDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [
    presentation,
    saveNow,
    goToSlide,
    stopPresentation,
    templateOpen,
    deleteTarget,
    zen,
    drawerOpen,
  ])

  if (fatalError) {
    return (
      <div className="app-fatal">
        <LogoMark size={44} />
        <h1>Canvas could not open its local storage</h1>
        <p>{fatalError}</p>
        <button type="button" className="primary-btn" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    )
  }

  if (!board || !boardIndex || !initialData) {
    return (
      <div className="app-loading">
        <LogoMark size={46} />
        <span>Loading your boards…</span>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Excalidraw
        key={board.id}
        excalidrawAPI={(api) => {
          apiRef.current = api
          if (fitOnOpenRef.current) {
            fitOnOpenRef.current = false
            window.setTimeout(() => fitScene(api), 120)
          }
        }}
        initialData={initialData}
        onChange={handleChange}
        onPaste={handlePaste}
        onScrollChange={(scrollX, scrollY, zoom) => {
          if (presentationRef.current) {
            syncPresentationMask({ scrollX, scrollY, zoom: zoom.value })
          }
        }}
        theme={resolvedTheme}
        viewModeEnabled={Boolean(presentation)}
        zenModeEnabled={zen}
        validateEmbeddable={true}
      >
        <WelcomeScreen>
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Logo>
              <span className="welcome-logo">
                <LogoMark size={64} />
              </span>
            </WelcomeScreen.Center.Logo>
            <WelcomeScreen.Center.Heading>Think it. Draw it. Keep it.</WelcomeScreen.Center.Heading>
            <WelcomeScreen.Center.Menu>
              <WelcomeScreen.Center.MenuItem
                icon={<TemplateIcon />}
                onSelect={() => {
                  setDrawerOpen(false)
                  setTemplateOpen(true)
                }}
              >
                Start from a template
              </WelcomeScreen.Center.MenuItem>
              <WelcomeScreen.Center.MenuItem
                icon={<BoardsIcon />}
                onSelect={() => setDrawerOpen(true)}
                shortcut="Ctrl+B"
              >
                Open your boards
              </WelcomeScreen.Center.MenuItem>
              <WelcomeScreen.Center.MenuItemHelp />
            </WelcomeScreen.Center.Menu>
          </WelcomeScreen.Center>
          <WelcomeScreen.Hints.MenuHint>Press Ctrl+B to switch boards.</WelcomeScreen.Hints.MenuHint>
          <WelcomeScreen.Hints.ToolbarHint>Pick a tool below and start drawing.</WelcomeScreen.Hints.ToolbarHint>
          <WelcomeScreen.Hints.HelpHint>Press ? anytime to see keyboard shortcuts.</WelcomeScreen.Hints.HelpHint>
        </WelcomeScreen>

        <MainMenu>
          <MainMenu.Item
            icon={<BoardsIcon />}
            shortcut="Ctrl+B"
            onSelect={() => setDrawerOpen(true)}
          >
            Boards
          </MainMenu.Item>
          <MainMenu.Item
            icon={<TemplateIcon />}
            shortcut="Ctrl+Alt+N"
            onSelect={() => {
              setDrawerOpen(false)
              setTemplateOpen(true)
            }}
          >
            New from template…
          </MainMenu.Item>
          <MainMenu.Item icon={<SaveIcon />} shortcut="Ctrl+S" onSelect={() => void saveNow()}>
            Save now
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.Item icon={<DownloadIcon />} onSelect={() => void handleExport('png')}>
            Export PNG
          </MainMenu.Item>
          <MainMenu.Item icon={<DownloadIcon />} onSelect={() => void handleExport('svg')}>
            Export SVG
          </MainMenu.Item>
          <MainMenu.Item icon={<DownloadIcon />} onSelect={() => void handleExport('json')}>
            Export scene (.excalidraw)
          </MainMenu.Item>
          <MainMenu.Item icon={<CopyIcon />} onSelect={() => void handleExport('copy')}>
            Copy PNG to clipboard
          </MainMenu.Item>
          <MainMenu.Item icon={<UploadIcon />} onSelect={() => void importScene()}>
            Import scene…
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.Item icon={<PlayIcon />} onSelect={startPresentation}>
            Present frames
          </MainMenu.Item>
          <MainMenu.Item icon={<FocusIcon />} onSelect={toggleZen}>
            Zen mode
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.Item icon={<DuplicateIcon />} onSelect={() => void duplicateCurrent()}>
            Duplicate board
          </MainMenu.Item>
          <MainMenu.Item icon={<TrashIcon />} onSelect={() => setDeleteTarget(board)}>
            Delete board
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.CommandPalette />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.ToggleTheme
            allowSystemTheme={true}
            theme={themePref}
            onSelect={(next) => handleThemeChange(next)}
          />
        </MainMenu>
      </Excalidraw>

      {presentationMask && (
        <div
          className="presentation-mask"
          style={{
            left: presentationMask.left,
            top: presentationMask.top,
            width: presentationMask.width,
            height: presentationMask.height,
            boxShadow: `0 0 0 100vmax ${presentationMask.background}`,
          }}
          aria-hidden="true"
        />
      )}

      {!presentation && (
        <SavePill
          name={board.name}
          state={saveState}
          shifted={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        />
      )}
      {zen && !presentation && <ZenBar onExit={() => setZen(false)} />}
      {presentation && (
        <PresentationBar
          current={presentation.index}
          total={presentation.frames.length}
          onPrev={() => goToSlide(presentation.index - 1)}
          onNext={() => goToSlide(presentation.index + 1)}
          onExit={stopPresentation}
        />
      )}

      <BoardDrawer
        open={drawerOpen}
        boards={boardIndex.boards}
        activeId={board.id}
        theme={themePref}
        storageLabel={storagePath}
        isDesktop={desktop}
        busy={busy}
        onClose={() => setDrawerOpen(false)}
        onOpen={(id) => void openBoard(id)}
        onCreate={() => {
          setDrawerOpen(false)
          setTemplateOpen(true)
        }}
        onImport={() => void importScene()}
        onRename={(id, name) => void handleRename(id, name)}
        onDuplicate={(id) => void duplicateCurrent(id)}
        onDelete={(target) => setDeleteTarget(target)}
        onToggleStar={(id, starred) => void handleStar(id, starred)}
        onThemeChange={handleThemeChange}
      />

      <TemplatePicker
        open={templateOpen}
        busy={busy}
        onClose={() => !busy && setTemplateOpen(false)}
        onPick={(id) => void createFromTemplate(id)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this board?"
        body={
          deleteTarget
            ? `“${deleteTarget.name}” and its images will be permanently removed from this device. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete board"
        danger
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
