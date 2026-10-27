# Canvas

A local-first, multi-board whiteboard built with [Tauri v2](https://tauri.app/), [React 19](https://react.dev/), and [Excalidraw](https://excalidraw.com/).

Canvas runs as a lightweight desktop app (or in a browser during development) and keeps every board on your own device — no account, no cloud, no lock-in.

## Trailer

[![Watch the Canvas trailer — 45 seconds](docs/canvas-trailer-poster.png)](docs/canvas-trailer.mp4)

<sub>MP4 (11 MB) · [WebM (5.3 MB)](docs/canvas-trailer.webm) — recorded from the real app: template previews, tags, version history, mind-map layout, quick switcher, and dark mode.</sub>

## Features

- **Multiple boards** — create, rename, pin, duplicate, search, and delete boards from a slide-out library.
- **18 ready-made use cases** — start from a blank canvas, brainstorm, Kanban, flowchart, mind map, wireframe, user journey, SWOT, retrospective, meeting notes, weekly planner, Cornell study notes, roadmap, org chart, storyboard, Venn diagram, sequence diagram, or a presentable slide deck.
- **Template previews** — every gallery card renders a live SVG thumbnail of the actual template, regenerated for light and dark mode.
- **Board tags** — label boards (`study`, `client`, `someday`, …) and filter the library by tag with one click.
- **Version history** — snapshots every 5 minutes while you edit, a manual **Snapshot now**, and one-click restore. Arranging a mind map saves a safety snapshot first.
- **Cross-board links** — attach a `canvas://board/…` link to any shape; clicking that shape jumps to the target board.
- **Markdown export** — write every board to one structured `.md` file, grouped by board and frame, with tags and updated dates.
- **Mind map auto-arrange** — turn a loose web of shapes and connectors into a tidy radial layout around the busiest hub.
- **Full-text canvas search** — search board names and the text inside every canvas, then jump straight to the matching element on the right board.
- **Quick switcher** — press **Ctrl+K** to fuzzy-find boards, templates, and actions from one keyboard-first dialog.
- **Workspace backup & restore** — export every board into one portable JSON file and restore it later as new boards.
- **Local-first auto-save** — changes are debounced and persisted automatically, with a live Saved / Unsaved / Saving / Save failed indicator.
- **Images on disk** — embedded images are extracted to per-board `assets/` folders instead of bloating the scene file.
- **Presentation mode** — Excalidraw frames become slides; navigate with arrow keys, Page Up/Down, or Space, and exit with Escape.
- **Zen mode** — hide the app chrome and focus on the canvas (Esc to leave).
- **Export & import** — save as PNG (2×), SVG, or `.excalidraw` JSON, copy a PNG straight to the clipboard, and import existing Excalidraw scenes as new boards.
- **Paste-to-embed** — paste an HTTP(S) URL to drop a centered, interactive embeddable on the canvas.
- **Themes** — light, dark, or follow the system setting. Toggle instantly with the sun/moon button beside the Library, the switch in the board drawer, or Excalidraw's menu; template colors and thumbnails adapt automatically.
- **Legacy migration** — the previous single-board `board.json` + `assets/` layout is imported into the new multi-board library on first run.
- **Browser fallback** — `npm run dev` works without Tauri and stores boards in `localStorage`.

## Canvas vs. the original Excalidraw

Canvas uses Excalidraw as its drawing engine, so everything you can draw in Excalidraw you can draw here — the difference is everything around the canvas.

| Capability | Canvas | Original Excalidraw |
| --- | --- | --- |
| Drawing tools, shapes, arrows, text, frames, libraries | Yes — identical engine | Yes |
| Multiple named boards | Built-in board library stored on disk | One active scene; excalidraw.com keeps a basic recent-scenes list in browser storage |
| Where data lives | Your own app-data folder, no account | `.excalidraw` files you manage yourself, or Excalidraw+ cloud (paid) |
| Board library features | Pin, rename, duplicate, delete, tags, tag filters, live search over names and canvas text | No pinning, tags, or cross-board search |
| Template gallery | 18 purpose-built use cases with live light/dark previews | Built-in examples and Excalidraw+ templates; no thumbnail gallery in the editor |
| Version history | Automatic snapshots every 5 minutes + manual snapshots, one-click restore | Undo/redo within the session; no snapshot history |
| Backup / restore | Whole workspace to a single JSON file and back | Manual file export per scene |
| Markdown export | One `.md` for the whole workspace, grouped by board and frame | Not available |
| Links between boards | `canvas://board/…` links on shapes that jump between boards | External URL links only (one scene per tab/file) |
| Layout help | One-click radial mind-map arrangement with a safety snapshot | Manual positioning only |
| Search | Full-text search across every board, plus Ctrl+K palette | In-scene search only |
| Presentation | Frames become slides with a presentation bar | Frames + zoom-to-frame, no slideshow mode |
| Theme | App-wide light/dark/system toggle, SVG previews adapt | Light/dark in the editor |
| Packaging | Desktop app (Tauri) with native save dialogs | Web app / self-hosted / Excalidraw+ |
| Collaboration | Deliberately none — local, single user | Real-time collaboration (Excalidraw+ or self-hosted) |

The last row is the honest trade-off: Canvas is built for a single user's local workspace, not for live multi-user editing.

## Using Canvas

### Draw

Pick any Excalidraw tool from the toolbar: selection, hand, rectangle, diamond, ellipse, arrow, line, draw, text, image, eraser, or frame. The properties panel on the left controls stroke, background, fill style, stroke width, sloppiness, edges, arrowheads, opacity, layers, and alignment. Fonts, font sizes, and text alignment are available while editing text.

Menus also expose Excalidraw's command palette, native export dialog, help/shortcuts, clear canvas, canvas background, and theme toggle.

### Manage boards

- Click the board name pill at the top of the canvas, or press **Ctrl+B**, to open the board library.
- **New board** opens the template gallery. **Import** loads an `.excalidraw` or Excalidraw JSON file as a new board.
- Hover a board row to pin, tag, open its version history, rename, duplicate, or delete it. Starred boards stay at the top; the rest sort by last edit.
- Search filters boards by name. Type at least two characters to also search text, shape labels, and frame names inside every canvas. Click a **Canvas text** result to open the right board and focus that element.
- Deleting the last remaining board creates a fresh blank one.

### Tags and filtering

Click the tag button on a board row to open the tag editor. A board can hold up to 8 tags of 24 characters each; tags are trimmed, de-duplicated, and suggested from tags you already use. Saved tags appear as chips under the board name, and the tag filter row at the top of the library narrows the list to one tag (plus the current search text).

### Version history

Open a board's history from the tag/history buttons on its row, **Main menu → Version history…**, or the quick switcher.

- Snapshots are taken automatically while a board is being edited, at most once every 5 minutes, plus a manual **Snapshot now**.
- Each entry shows the date, why it was taken (auto, manual, before restore, before layout), and its element count.
- **Restore** replaces the board with that snapshot; the current state is snapshotted first, so restoring is itself undoable.
- Rotation keeps the 12 newest snapshots per board on desktop (6 in the browser).

### Cross-board links

Choose **Main menu → Link selection to a board…** (or run it from the quick switcher), pick a board, and every selected element gets a `canvas://board/<id>` link. Clicking one of those elements opens the linked board inside Canvas instead of the system browser. Links add a link badge to the shape, exactly like a normal Excalidraw URL.

### Arrange a mind map

Choose **Main menu → Arrange shapes as mind map…** after scattering loose shapes with connectors. Canvas picks the shape with the most connections as the hub and lays the rest out in a ring around it, keeping connectors attached to shape edges and moving bound text with its shape. The move is confirmed first and a `before-layout` snapshot is saved, so **Version history** can undo it.

### Export to Markdown

**Main menu → Export all boards to Markdown…** (or the quick switcher) writes `canvas-workspace-<date>.md`. Each board becomes a `##` section with template, tags, and last-updated metadata; frames become `###` headings; shape labels and free text are listed as bullets. Useful for pasting a workspace into notes, docs, or a knowledge base.


### Quick switcher

Press **Ctrl/Cmd+K** anywhere to open the quick switcher. Start typing to fuzzy-match boards, templates, and app actions such as creating a blank board, importing a scene, backing up the workspace, presenting frames, or entering zen mode. Use **↑/↓** and **Enter** to run a result, or **Esc** to close.

### Backup and restore

From the main menu or the quick switcher:

- **Back up all boards** writes the complete workspace — board metadata, scenes, and embedded images — into a single `canvas-workspace-<date>.json` file.
- **Restore backup** validates a backup file and adds its boards to the current workspace with unique names. Restoring never overwrites or deletes existing boards.

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
| `Ctrl/Cmd + K` | Open the quick switcher |
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
├── boards.json                 # board index: names, tags, stars, active board
└── boards\
    └── <board-id>\
        ├── board.json          # Excalidraw scene (elements + view state)
        ├── assets\             # embedded images, named by file id
        └── snapshots\          # version-history snapshots (newest 12 kept)
```

Browser development mode uses `localStorage` keys `canvas-app:index`, `canvas-app:board:<id>`, and `canvas-app:snapshots:<id>`. If browser storage fills up, Canvas shows a friendly quota error; the desktop app has no such limit.

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
│   │   ├── BoardDrawer.tsx         # Board library, tags, canvas-text search, theme switch
│   │   ├── QuickSwitcher.tsx       # Ctrl+K boards / templates / actions palette
│   │   ├── TemplatePicker.tsx      # Searchable template gallery with live previews
│   │   ├── TagsDialog.tsx          # Board tag editor
│   │   ├── HistoryDialog.tsx       # Snapshot list, manual snapshot, restore
│   │   ├── LinkBoardDialog.tsx     # Target-board picker for cross-board links
│   │   ├── ConfirmDialog.tsx       # Destructive-action confirmation
│   │   ├── Chrome.tsx              # Save pill, presentation bar, zen bar
│   │   └── icons.tsx               # SVG icon set
│   ├── utils/
│   │   ├── dataUrl.ts              # Data URL <-> bytes helpers
│   │   ├── exportScene.ts          # PNG / SVG / JSON / clipboard export
│   │   ├── files.ts                # Native save dialogs + browser downloads
│   │   ├── layout.ts               # Radial mind-map arrangement
│   │   ├── markdown.ts             # Workspace -> Markdown conversion
│   │   └── templatePreview.ts      # Cached light/dark SVG template thumbnails
│   └── excalidraw-overrides.css    # Toolbar placement overrides
└── src-tauri/
    ├── tauri.conf.json
    ├── capabilities/default.json   # fs / dialog / window permissions
    └── src/lib.rs
```

## Notes and limits

- Canvas is **single-user and offline-first**. It has no cloud sync, real-time collaboration, shareable links, accounts, or comment threads.
- Version history is local to each device: 12 snapshots per board on desktop, 6 in the browser. Snapshots are not part of the workspace backup file.
- Cross-board links use the internal `canvas://board/<id>` scheme and only work inside Canvas; the same link copied elsewhere will not open anything.
- The board index is a local file, so avoid opening the same app-data folder from two running copies at once.
- OS drag-and-drop is disabled in the Tauri window; use **Import scene…** or paste images directly onto the canvas.
- Exporting uses Excalidraw's own renderer, so PNG/SVG output matches the editor exactly.

## License

MIT
