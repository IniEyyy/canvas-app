import { exportToSvg } from '@excalidraw/excalidraw'
import { prepareTemplateFonts, sceneForTemplate } from '../templates'

type PreviewTheme = 'light' | 'dark'

const cache = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()
let queue: Promise<unknown> = Promise.resolve()

export function getTemplatePreview(id: string, theme: PreviewTheme): Promise<string | null> {
  if (id === 'blank') return Promise.resolve(null)
  const key = `${id}:${theme}`
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)
  const existing = pending.get(key)
  if (existing) return existing

  const job = (queue = queue.then(async () => {
    try {
      await prepareTemplateFonts()
      const scene = sceneForTemplate(id)
      if (!scene.elements.length) return null
      const svg = await exportToSvg({
        elements: scene.elements as any,
        appState: {
          exportBackground: true,
          viewBackgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          exportWithDarkMode: theme === 'dark',
        } as any,
        files: {},
        exportPadding: 18,
      })
      const markup = new XMLSerializer().serializeToString(svg)
      const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
      cache.set(key, url)
      return url
    } catch (error) {
      console.warn('Could not render a template preview:', id, error)
      return null
    } finally {
      pending.delete(key)
    }
  })) as Promise<string | null>

  pending.set(key, job)
  return job
}
