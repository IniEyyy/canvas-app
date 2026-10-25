import { isTauri } from '@tauri-apps/api/core'
import { save as saveDialog } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

export type SaveFilter = {
  name: string
  extensions: string[]
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 60)
  return cleaned || 'board'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function saveBlob(blob: Blob, filename: string, filter: SaveFilter): Promise<boolean> {
  if (isTauri()) {
    const path = await saveDialog({
      title: 'Save from Canvas',
      defaultPath: filename,
      filters: [filter],
    })
    if (!path) return false
    const bytes = new Uint8Array(await blob.arrayBuffer())
    await writeFile(path, bytes)
    return true
  }

  downloadBlob(blob, filename)
  return true
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    document.body.appendChild(input)
    let settled = false
    const finish = (file: File | null) => {
      if (settled) return
      settled = true
      input.remove()
      resolve(file)
    }
    input.addEventListener(
      'change',
      () => {
        finish(input.files?.[0] ?? null)
      },
      { once: true },
    )
    window.addEventListener(
      'focus',
      () => {
        window.setTimeout(() => {
          if (!input.files?.length) finish(null)
        }, 500)
      },
      { once: true },
    )
    input.click()
  })
}
