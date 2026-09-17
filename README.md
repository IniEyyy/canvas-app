# Canvas App

A local-first infinite whiteboard built with [Tauri v2](https://tauri.app/), [React 19](https://react.dev/), and [Excalidraw](https://excalidraw.com/).

Boards are automatically saved to your OS app-data directory. Paste a URL to instantly embed it on the canvas.

## Features

- **Infinite canvas** — Freeform whiteboarding powered by Excalidraw with a hand-drawn rough style
- **Local-first auto-save** — Every change is persisted to `board.json` in the OS app-data directory (debounced 800 ms), no account or cloud needed
- **Separate asset store** — Embedded images are written as binary files to an `assets/` folder, keeping `board.json` lightweight
- **Paste-to-embed** — Paste an HTTP(S) URL to instantly create a centered, clickable embeddable element on the canvas
- **Desktop native** — Runs as a Tauri app on your OS with filesystem access to readable storage locations

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 7
- **Desktop:** Tauri v2 (Rust)
- **Canvas:** Excalidraw

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) (stable)
- [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/)

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (frontend only, browser)
npm run dev

# Start the full Tauri desktop app
npm run tauri dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 1420) |
| `npm run build` | Type-check and build frontend to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run tauri` | Run Tauri CLI (`tauri dev` / `tauri build`) |

## Project Structure

```
canvas-app/
├── index.html              # HTML entry point
├── src/
│   ├── main.tsx            # React bootstrap
│   ├── App.tsx             # Excalidraw integration & auto-save
│   ├── utils/dataUrl.ts    # Data-URL / binary helpers
│   └── excalidraw-overrides.css
├── src-tauri/
│   ├── src/
│   │   ├── main.rs         # Rust binary entry
│   │   └── lib.rs          # Tauri app builder
│   ├── tauri.conf.json     # Tauri configuration
│   └── capabilities/       # Permission grants
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

[MIT](LICENSE)
