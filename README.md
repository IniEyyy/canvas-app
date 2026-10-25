# Canvas

A local-first, multi-board whiteboard built with [Tauri v2](https://tauri.app/), [React 19](https://react.dev/), and [Excalidraw](https://excalidraw.com/).

Canvas runs as a lightweight desktop app (or in a browser during development) and keeps every board on your own device — no account, no cloud, no lock-in.

## Features

- **Multiple boards** — create, rename, pin, duplicate, search, and delete boards from a slide-out library.
- **18 ready-made use cases** — start from a blank canvas, brainstorm, Kanban, flowchart, mind map, wireframe, user journey, SWOT, retrospective, meeting notes, weekly planner, Cornell study notes, roadmap, org chart, storyboard, Venn diagram, sequence diagram, or a presentable slide deck.
- **Local-first auto-save** — changes are debounced and persisted automatically, with a live Saved / Unsaved / Saving / Save failed indicator.
- **Images on disk** — embedded images are extracted to per-board `assets/` folders instead of bloating the scene file.
- **Presentation mode** — Excalidraw frames become slides; navigate with arrow keys, Page Up/Down, or Space, and exit with Escape.
- **Zen mode** — hide the app chrome and focus on the canvas (Esc to leave).
- **Export & import** — save as PNG (2×), SVG, or `.excalidraw` JSON, copy a PNG straight to the clipboard, and import existing Excalidraw scenes as new boards.
- **Paste-to-embed** — paste an HTTP(S) URL to drop a centered, interactive embeddable on the canvas.
- **Themes** — light, dark, or follow the system setting.
- **Legacy migration** — the previous single-board `board.json` + `assets/` layout is imported into the new multi-board library on first run.
- **Browser fallback** — `npm run dev` works without Tauri and stores boards in `localStorage`.

## Using Canvas

### Draw

Pick any Excalidraw tool from the toolbar: selection, hand, rectangle, diamond, ellipse, arrow, line, draw, text, image, eraser, or frame. The properties panel on the left controls stroke, background, fill style, stroke width, sloppiness, edges, arrowheads, opacity, layers, and alignment. Fonts, font sizes, and text alignment are available while editing text.

Menus also expose Excalidraw's command palette, native export dialog, help/shortcuts, clear canvas, canvas background, and theme toggle.

### Manage boards

- Click the board name pill at the top of the canvas, or press **Ctrl+B**, to open the board library.
- **New board** opens the template gallery. **Import** loads an `.excalidraw` or Excalidraw JSON file as a new board.
- Hover a board row to pin, rename, duplicate, or delete it. Starred boards stay at the top; the rest sort by last edit.
- Search filters boards by name. Deleting the last remaining board creates a fresh blank one.

### Present

Add frames to your canvas (or start from the **Slide deck** template), then choose **Main menu → Present frames**. Canvas zooms into the first frame and hides the editor UI. Use the presentation bar or the keyboard to move between frames. **Esc** exits.

### Export and import

From the main menu:

| Action | Result |
| --- | --- |
| Export PNG | 2× PNG with a native save dialog (desktop) or browser download |
| Export SVG | Editable vector SVG |
| Export scene (.excalidraw) | JSON scene compatible with Excalidraw |
| Copy PNG to clipboard | PNG on the system clipboard |
| Import scene… | Loads `.excalidraw` / JSON as a new board |

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + S` | Save now |
| `Ctrl/Cmd + B` | Toggle the board library |
| `Ctrl/Cmd + Alt + N` | Open the template gallery |
| `Esc` | Close dialog / exit zen / exit presentation / close library |
| `←` `→` `Space` `Page Up/Down` | Previous / next slide while presenting |
| Excalidraw defaults | Tools (`v`, `r`, `d`, `o`, `a`, `l`, `p`, `t`, `e`, `f`), undo/redo, zoom, grouping, lock, duplicate, and more |

The Excalidraw help dialog (**?**) lists the full set of canvas shortcuts.

## Storage

Desktop (Tauri) stores everything under the OS app-data directory, e.g. on Windows:

```
%APPDATA%\com.ey.canvasapp\
├── boards.json                 # board index: names, stars, active board
└── boards\
    └── <board-id>\
        ├── board.json          # Excalidraw scene (elements + view state)
        └── assets\             # embedded images, named by file id
```

Browser development mode uses `localStorage` keys `canvas-app:index` and `canvas-app:board:<id>`. If browser storage fills up, Canvas shows a friendly quota error; the desktop app has no such limit.

Saved state includes the scene elements, embedded files, and a whitelisted subset of view state (background, grid, scroll/zoom, current tool styling, export settings). Transient state such as selection, collaboration, and dialogs is intentionally not persisted.

## Tech stack

- React 19 + TypeScript 5.8 + Vite 7
- Tauri v2 (Rust) with `fs` and `dialog` plugins
- Excalidraw 0.18

## Development

Prerequisites: Node.js 18+, Rust stable, and the [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run dev        # browser-only dev server on http://localhost:1420
npm run tauri dev  # full desktop app
npm run build      # type-check + production frontend build
npm run tauri build
```

### Project layout

```
canvas-app/
├── index.html
├── public/canvas.svg
├── src/
│   ├── App.tsx                     # Excalidraw orchestration, boards, save queue, shortcuts
│   ├── App.css                     # App chrome, drawer, modals, responsive styles
│   ├── scene.ts                    # App-state whitelist + scene normalization
│   ├── storage.ts                  # Tauri/localStorage multi-board adapter
│   ├── templates.ts                # 18 template scene builders
│   ├── components/
│   │   ├── BoardDrawer.tsx         # Board library + theme switch
│   │   ├── TemplatePicker.tsx      # Searchable template gallery
│   │   ├── ConfirmDialog.tsx       # Destructive-action confirmation
│   │   ├── Chrome.tsx              # Save pill, presentation bar, zen bar
│   │   └── icons.tsx               # SVG icon set
│   ├── utils/
│   │   ├── dataUrl.ts              # Data URL <-> bytes helpers
│   │   ├── exportScene.ts          # PNG / SVG / JSON / clipboard export
│   │   └── files.ts                # Native save dialogs + browser downloads
│   └── excalidraw-overrides.css    # Toolbar placement overrides
└── src-tauri/
    ├── tauri.conf.json
    ├── capabilities/default.json   # fs / dialog / window permissions
    └── src/lib.rs
```

## Notes and limits

- Canvas is **single-user and offline-first**. It has no cloud sync, real-time collaboration, shareable links, accounts, or comment threads.
- The board index is a local file, so avoid opening the same app-data folder from two running copies at once.
- OS drag-and-drop is disabled in the Tauri window; use **Import scene…** or paste images directly onto the canvas.
- Exporting uses Excalidraw's own renderer, so PNG/SVG output matches the editor exactly.

## License

MIT
