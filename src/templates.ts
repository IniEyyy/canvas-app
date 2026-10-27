import { convertToExcalidrawElements } from '@excalidraw/excalidraw'
import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/data/transform'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import { blankScene } from './scene'
import type { SceneData } from './types'

type Skeleton = ExcalidrawElementSkeleton

export type TemplateCategory =
  | 'Start'
  | 'Ideation'
  | 'Planning'
  | 'Diagrams'
  | 'Product'
  | 'Study'
  | 'Strategy'
  | 'Teams'
  | 'Presenting'

export type TemplateIcon =
  | 'blank'
  | 'spark'
  | 'kanban'
  | 'flow'
  | 'mindmap'
  | 'wireframe'
  | 'journey'
  | 'swot'
  | 'retro'
  | 'meeting'
  | 'week'
  | 'study'
  | 'roadmap'
  | 'org'
  | 'storyboard'
  | 'venn'
  | 'sequence'
  | 'deck'

export type TemplateDef = {
  id: string
  name: string
  description: string
  category: TemplateCategory
  accent: string
  icon: TemplateIcon
  build: () => Skeleton[]
}

const C = {
  ink: '#1e1e1e',
  muted: '#495057',
  faint: '#868e96',
  line: '#adb5bd',
  hairline: '#dee2e6',
  paper: '#ffffff',
  panel: '#f8f9fa',
  yellow: '#ffec99',
  green: '#b2f2bb',
  blue: '#a5d8ff',
  purple: '#d0bfff',
  red: '#ffc9c9',
  orange: '#ffd8a8',
  teal: '#96f2d7',
  pink: '#fcc2d7',
}

// Excalifont (5) is the modern default; Virgil (1) is deprecated and only
// lazy-loaded, which caused pre-measured template labels to render clipped.
const FONT = 5

type RectOpts = {
  x: number
  y: number
  w: number
  h: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeStyle?: 'solid' | 'dashed' | 'dotted'
  rough?: number
  round?: boolean
  text?: string
  size?: number
  textColor?: string
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  opacity?: number
  id?: string
}

function rect(opts: RectOpts): Skeleton {
  const element: any = {
    type: 'rectangle',
    x: opts.x,
    y: opts.y,
    width: opts.w,
    height: opts.h,
    backgroundColor: opts.fill ?? 'transparent',
    fillStyle: 'solid',
    strokeColor: opts.stroke ?? C.ink,
    strokeWidth: opts.strokeWidth ?? 1.25,
    strokeStyle: opts.strokeStyle ?? 'solid',
    roughness: opts.rough ?? 1,
    roundness: opts.round === false ? null : { type: 3 },
    opacity: opts.opacity ?? 100,
  }
  if (opts.id) element.id = opts.id
  if (opts.text) {
    element.label = {
      text: opts.text,
      fontSize: opts.size ?? 18,
      fontFamily: FONT,
      textAlign: opts.align ?? 'center',
      verticalAlign: opts.valign ?? 'middle',
      strokeColor: opts.textColor ?? C.ink,
    }
  }
  return element as Skeleton
}

function ellipse(opts: RectOpts): Skeleton {
  const element: any = {
    ...rect(opts),
    type: 'ellipse',
    roundness: null,
  }
  if (opts.text) {
    element.label = {
      text: opts.text,
      fontSize: opts.size ?? 18,
      fontFamily: FONT,
      textAlign: opts.align ?? 'center',
      verticalAlign: opts.valign ?? 'middle',
      strokeColor: opts.textColor ?? C.ink,
    }
  }
  return element as Skeleton
}

function diamond(opts: RectOpts): Skeleton {
  const element: any = {
    ...rect(opts),
    type: 'diamond',
    roundness: null,
  }
  if (opts.text) {
    element.label = {
      text: opts.text,
      fontSize: opts.size ?? 18,
      fontFamily: FONT,
      textAlign: opts.align ?? 'center',
      verticalAlign: opts.valign ?? 'middle',
      strokeColor: opts.textColor ?? C.ink,
    }
  }
  return element as Skeleton
}

function textEl(
  text: string,
  x: number,
  y: number,
  size = 18,
  color = C.ink,
  align: 'left' | 'center' | 'right' = 'left',
  id?: string,
): Skeleton {
  const element: any = {
    type: 'text',
    text,
    x,
    y,
    fontSize: size,
    fontFamily: FONT,
    textAlign: align,
    strokeColor: color,
  }
  if (id) element.id = id
  return element as Skeleton
}

function title(text: string, x = 40, y = 30): Skeleton {
  return textEl(text, x, y, 32)
}

function subtitle(text: string, x = 42, y = 78): Skeleton {
  return textEl(text, x, y, 16, C.muted)
}

function sticky(text: string, x: number, y: number, fill: string, w = 190, h = 160, size = 16): Skeleton {
  return rect({
    x,
    y,
    w,
    h,
    fill,
    stroke: 'transparent',
    text,
    size,
    round: true,
    rough: 1,
  })
}

function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = C.ink,
  dashed = false,
  head = true,
): Skeleton {
  const dx = x2 - x1
  const dy = y2 - y1
  const element: any = {
    type: 'arrow',
    x: x1,
    y: y1,
    width: Math.abs(dx),
    height: Math.abs(dy),
    points: [
      [0, 0],
      [dx, dy],
    ],
    strokeColor: color,
    strokeWidth: 1.5,
    strokeStyle: dashed ? 'dashed' : 'solid',
    roughness: 0,
    endArrowhead: head ? 'arrow' : null,
    startArrowhead: null,
  }
  return element as Skeleton
}

function polyline(
  points: Array<[number, number]>,
  color = C.line,
  dashed = false,
  width = 1.5,
): Skeleton {
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const element: any = {
    type: 'line',
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
    points: points.map(([x, y]) => [x - minX, y - minY]),
    strokeColor: color,
    strokeWidth: width,
    strokeStyle: dashed ? 'dashed' : 'solid',
    roughness: 0,
    startArrowhead: null,
    endArrowhead: null,
  }
  return element as Skeleton
}

function frameEl(
  id: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  children: string[],
): Skeleton {
  const element: any = {
    type: 'frame',
    id,
    name,
    x,
    y,
    width: w,
    height: h,
    children,
  }
  return element as Skeleton
}

function slide(
  index: number,
  x: number,
  y: number,
  heading: string,
  lines: string[],
  accent: string,
): Skeleton[] {
  const frameId = `slide-${index}`
  const childIds: string[] = []
  const elements: Skeleton[] = []
  const add = (element: Skeleton, id: string) => {
    ;(element as any).id = id
    childIds.push(id)
    elements.push(element)
  }

  add(rect({ x, y, w: 14, h: 540, fill: accent, stroke: 'transparent', round: false, rough: 0 }), `${frameId}-bar`)
  add(textEl(`SLIDE 0${index}`, x + 70, y + 64, 15, C.faint), `${frameId}-kicker`)
  add(textEl(heading, x + 70, y + 100, 44), `${frameId}-title`)
  lines.forEach((lineText, lineIndex) => {
    add(textEl(lineText, x + 70, y + 220 + lineIndex * 58, 21, C.ink), `${frameId}-line-${lineIndex}`)
  })
  add(textEl('canvas-app · local-first whiteboard', x + 70, y + 486, 12, C.faint), `${frameId}-footer`)
  add(
    ellipse({
      x: x + 720,
      y: y + 190,
      w: 180,
      h: 180,
      fill: accent,
      stroke: accent,
      text: String(index).padStart(2, '0'),
      size: 52,
      opacity: 45,
      rough: 0,
    }),
    `${frameId}-badge`,
  )

  return [frameEl(frameId, `${index} · ${heading}`, x, y, 960, 540, childIds), ...elements]
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'blank',
    name: 'Blank canvas',
    description: 'A clean infinite canvas for anything you have in mind.',
    category: 'Start',
    accent: '#495057',
    icon: 'blank',
    build: () => [],
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'A big idea in the middle, sticky notes all around it.',
    category: 'Ideation',
    accent: '#f59f00',
    icon: 'spark',
    build: () => [
      title('Brainstorm'),
      subtitle('Generate first. Judge later. Cluster what sticks.'),
      ellipse({
        x: 470,
        y: 330,
        w: 260,
        h: 120,
        fill: C.blue,
        text: 'Big idea',
        size: 24,
      }),
      polyline(
        [
          [470, 390],
          [290, 270],
        ],
        C.faint,
        true,
      ),
      polyline(
        [
          [470, 430],
          [290, 540],
        ],
        C.faint,
        true,
      ),
      polyline(
        [
          [600, 330],
          [530, 266],
        ],
        C.faint,
        true,
      ),
      polyline(
        [
          [600, 450],
          [464, 620],
        ],
        C.faint,
        true,
      ),
      polyline(
        [
          [730, 390],
          [800, 270],
        ],
        C.faint,
        true,
      ),
      polyline(
        [
          [730, 420],
          [800, 540],
        ],
        C.faint,
        true,
      ),
      sticky('What if we…', 100, 180, C.yellow),
      sticky('User pain point', 100, 470, C.green),
      sticky('Wild idea', 340, 110, C.purple),
      sticky('Quick win', 340, 620, C.orange),
      sticky('Biggest risk', 800, 180, C.red),
      sticky('Next experiment', 800, 480, C.teal),
      textEl('Tip: rename a sticky by double-clicking it.', 100, 830, 14, C.faint),
    ],
  },
  {
    id: 'kanban',
    name: 'Kanban board',
    description: 'Three columns to see work moving from idea to done.',
    category: 'Planning',
    accent: '#228be6',
    icon: 'kanban',
    build: () => {
      const columns = [
        { x: 40, label: 'To do · 3', fill: C.blue, cards: ['Draft project brief', 'Collect references', 'Book kickoff'] },
        { x: 435, label: 'In progress · 2', fill: C.yellow, cards: ['Design first pass', 'Review with team'] },
        { x: 830, label: 'Done · 2', fill: C.green, cards: ['Align on goals', 'Set up workspace'] },
      ]
      const elements: Skeleton[] = [
        title('Kanban board'),
        subtitle('Limit work in progress. Finish before starting.'),
      ]
      columns.forEach((column) => {
        elements.push(
          rect({
            x: column.x,
            y: 140,
            w: 350,
            h: 620,
            fill: C.panel,
            stroke: C.hairline,
            round: true,
            rough: 0,
          }),
          rect({
            x: column.x + 20,
            y: 160,
            w: 310,
            h: 52,
            fill: column.fill,
            stroke: 'transparent',
            text: column.label,
            size: 18,
          }),
        )
        column.cards.forEach((card, cardIndex) => {
          elements.push(
            rect({
              x: column.x + 20,
              y: 235 + cardIndex * 105,
              w: 310,
              h: 80,
              fill: C.paper,
              stroke: C.hairline,
              text: card,
              size: 15,
              align: 'left',
              rough: 0,
            }),
          )
        })
        elements.push(
          rect({
            x: column.x + 20,
            y: 680,
            w: 310,
            h: 56,
            fill: 'transparent',
            stroke: C.line,
            strokeStyle: 'dashed',
            strokeWidth: 1,
            text: '+ Add a card',
            size: 14,
            textColor: C.faint,
            rough: 0,
          }),
        )
      })
      elements.push(textEl('Move a card by dragging it. Press N for a sticky note.', 40, 790, 14, C.faint))
      return elements
    },
  },
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Map a process with starts, actions, decisions and outcomes.',
    category: 'Diagrams',
    accent: '#12b886',
    icon: 'flow',
    build: () => [
      title('Flowchart'),
      subtitle('Rectangles are actions. Diamonds are decisions.'),
      ellipse({ x: 480, y: 110, w: 240, h: 70, fill: C.green, text: 'Start', size: 18 }),
      rect({ x: 480, y: 240, w: 240, h: 70, fill: C.yellow, text: 'Collect requirements', size: 17 }),
      diamond({ x: 480, y: 370, w: 240, h: 120, fill: C.blue, text: 'Approved?', size: 18 }),
      rect({ x: 820, y: 395, w: 200, h: 70, fill: C.green, text: 'Build & ship', size: 17 }),
      rect({ x: 180, y: 395, w: 200, h: 70, fill: C.orange, text: 'Revise scope', size: 17 }),
      ellipse({ x: 820, y: 565, w: 200, h: 70, fill: C.green, text: 'Done', size: 18 }),
      arrow(600, 180, 600, 240),
      arrow(600, 310, 600, 370),
      arrow(720, 430, 820, 430),
      textEl('Yes', 750, 400, 14, C.faint),
      arrow(480, 430, 380, 430),
      textEl('No', 415, 400, 14, C.faint),
      arrow(920, 465, 920, 565),
      polyline(
        [
          [280, 395],
          [280, 275],
          [480, 275],
        ],
        C.faint,
        true,
      ),
      textEl('iterate', 300, 250, 13, C.faint),
      textEl('Tip: drag a shape onto another edge to bind an arrow.', 40, 720, 14, C.faint),
    ],
  },
  {
    id: 'mindmap',
    name: 'Mind map',
    description: 'One topic, many branches — see how the pieces connect.',
    category: 'Diagrams',
    accent: '#7950f2',
    icon: 'mindmap',
    build: () => {
      const center = { x: 480, y: 340, w: 260, h: 110 }
      const branches = [
        { x: 480, y: 120, w: 200, h: 70, fill: C.blue, text: 'Goals' },
        { x: 790, y: 200, w: 190, h: 70, fill: C.green, text: 'People' },
        { x: 840, y: 360, w: 190, h: 70, fill: C.orange, text: 'Resources' },
        { x: 700, y: 550, w: 190, h: 70, fill: C.teal, text: 'Timeline' },
        { x: 440, y: 620, w: 200, h: 70, fill: C.red, text: 'Risks' },
        { x: 100, y: 440, w: 200, h: 70, fill: C.yellow, text: 'Ideas' },
        { x: 160, y: 220, w: 190, h: 70, fill: C.purple, text: 'Metrics' },
      ]
      const elements: Skeleton[] = [
        title('Mind map'),
        subtitle('Start fuzzy. Branch fast. Prune later.'),
        ellipse({ ...center, fill: C.purple, text: 'Central topic', size: 23 }),
      ]
      branches.forEach((branch) => {
        const bx = branch.x + branch.w / 2
        const by = branch.y + branch.h / 2
        const cx = center.x + center.w / 2
        const cy = center.y + center.h / 2
        const dx = bx - cx
        const dy = by - cy
        const reach = 1 / Math.hypot(dx / (center.w / 2), dy / (center.h / 2))
        elements.push(
          polyline(
            [
              [cx + dx * reach, cy + dy * reach],
              [bx, by],
            ],
            C.line,
            true,
          ),
          rect({ ...branch, text: branch.text, size: 18 }),
        )
      })
      return elements
    },
  },
  {
    id: 'wireframe',
    name: 'Wireframe',
    description: 'Sketch an interface layout before touching production code.',
    category: 'Product',
    accent: '#4dabf7',
    icon: 'wireframe',
    build: () => [
      title('Wireframe'),
      subtitle('Layout first. Details later.'),
      rect({ x: 40, y: 110, w: 1120, h: 620, fill: C.paper, stroke: C.ink, strokeWidth: 1.5, rough: 0 }),
      rect({ x: 40, y: 110, w: 1120, h: 54, fill: C.panel, stroke: C.hairline, round: true, rough: 0 }),
      ellipse({ x: 64, y: 130, w: 13, h: 13, fill: C.red, stroke: 'transparent', rough: 0 }),
      ellipse({ x: 86, y: 130, w: 13, h: 13, fill: C.yellow, stroke: 'transparent', rough: 0 }),
      ellipse({ x: 108, y: 130, w: 13, h: 13, fill: C.green, stroke: 'transparent', rough: 0 }),
      rect({ x: 150, y: 124, w: 300, h: 26, fill: C.paper, stroke: C.hairline, text: 'yourproduct.com', size: 12, textColor: C.faint, rough: 0 }),
      rect({ x: 40, y: 164, w: 220, h: 566, fill: C.panel, stroke: C.hairline, round: false, rough: 0 }),
      textEl('Menu', 66, 190, 15, C.faint),
      textEl('Overview', 66, 230, 16),
      textEl('Projects', 66, 270, 16),
      textEl('Team', 66, 310, 16),
      textEl('Settings', 66, 350, 16),
      rect({ x: 290, y: 200, w: 520, h: 190, fill: C.blue, stroke: 'transparent', rough: 0 }),
      textEl('A clear headline', 320, 230, 30),
      textEl('One sentence about the value.\nKeep it concrete.', 320, 285, 16, C.muted),
      rect({ x: 320, y: 330, w: 150, h: 42, fill: C.ink, stroke: 'transparent', text: 'Get started', size: 15, textColor: C.paper, rough: 0 }),
      rect({ x: 850, y: 200, w: 280, h: 190, fill: C.panel, stroke: C.line, strokeStyle: 'dashed', text: 'Image', size: 16, textColor: C.faint, rough: 0 }),
      textEl('Feature one\nShort supporting copy.', 290, 430, 16),
      rect({ x: 290, y: 480, w: 250, h: 120, fill: C.paper, stroke: C.hairline, rough: 0 }),
      textEl('Feature two\nShort supporting copy.', 560, 430, 16),
      rect({ x: 560, y: 480, w: 250, h: 120, fill: C.paper, stroke: C.hairline, rough: 0 }),
      textEl('Feature three\nShort supporting copy.', 830, 430, 16),
      rect({ x: 830, y: 480, w: 300, h: 120, fill: C.paper, stroke: C.hairline, rough: 0 }),
      textEl('Above the fold: one promise, one action.', 290, 660, 14, C.faint),
    ],
  },
  {
    id: 'journey',
    name: 'User journey',
    description: 'Map actions, feelings and friction across a customer journey.',
    category: 'Product',
    accent: '#e8590c',
    icon: 'journey',
    build: () => {
      const stages = ['Discover', 'Compare', 'Sign up', 'First value', 'Habit']
      const lanes = ['Actions', 'Feelings', 'Pain points']
      const cells = [
        [['Search & social'], ['Curious'], ['Too many options']],
        [['Reviews & pricing'], ['Skeptical'], ['Unclear differences']],
        [['Create account'], ['Hopeful'], ['Long form']],
        [['Complete first task'], ['Relieved'], ['Setup friction']],
        [['Weekly use'], ['Confident'], ['No reminders']],
      ]
      const elements: Skeleton[] = [
        title('User journey map'),
        subtitle('A journey is an experience, not a funnel.'),
        arrow(210, 118, 1160, 118, C.faint, false),
        textEl('Time', 1080, 90, 13, C.faint),
      ]
      stages.forEach((stage, stageIndex) => {
        const x = 210 + stageIndex * 195
        elements.push(
          rect({ x, y: 140, w: 185, h: 54, fill: stageIndex % 2 ? C.panel : C.blue, stroke: C.hairline, text: stage, size: 16, rough: 0 }),
        )
        lanes.forEach((_, laneIndex) => {
          const cell = cells[stageIndex][laneIndex][0]
          elements.push(
            rect({
              x: x + 10,
              y: 230 + laneIndex * 135,
              w: 165,
              h: 90,
              fill: laneIndex === 2 ? C.red : laneIndex === 1 ? C.yellow : C.paper,
              stroke: laneIndex === 0 ? C.hairline : 'transparent',
              text: cell,
              size: 13,
              rough: laneIndex === 0 ? 0 : 1,
            }),
          )
        })
      })
      lanes.forEach((lane, laneIndex) => {
        elements.push(
          rect({
            x: 40,
            y: 230 + laneIndex * 135,
            w: 150,
            h: 90,
            fill: C.panel,
            stroke: C.hairline,
            text: lane,
            size: 16,
            rough: 0,
          }),
        )
      })
      elements.push(
        rect({ x: 610, y: 222, w: 165, h: 368, fill: 'transparent', stroke: C.ink, strokeStyle: 'dashed', strokeWidth: 1.5, rough: 0 }),
        textEl('Moment of truth', 610, 200, 13, C.ink),
        textEl('Ask: where do users get stuck, and why?', 40, 680, 14, C.faint),
      )
      return elements
    },
  },
  {
    id: 'swot',
    name: 'SWOT analysis',
    description: 'Strengths, weaknesses, opportunities and threats in one view.',
    category: 'Strategy',
    accent: '#2f9e44',
    icon: 'swot',
    build: () => {
      const quadrants = [
        { x: 40, y: 140, fill: C.green, heading: 'Strengths', prompt: 'What do we do best?', lines: '• Deep expertise\n• Loyal users' },
        { x: 620, y: 140, fill: C.red, heading: 'Weaknesses', prompt: 'Where do we fall short?', lines: '• Slow onboarding\n• Thin team' },
        { x: 40, y: 450, fill: C.blue, heading: 'Opportunities', prompt: 'What can we leverage?', lines: '• New segment\n• Partner channel' },
        { x: 620, y: 450, fill: C.orange, heading: 'Threats', prompt: 'What could hurt us?', lines: '• Price pressure\n• Platform shift' },
      ]
      const elements: Skeleton[] = [
        title('SWOT analysis'),
        subtitle('Be honest. The point is to choose a move, not fill four boxes.'),
      ]
      quadrants.forEach((quadrant) => {
        elements.push(
          rect({ x: quadrant.x, y: quadrant.y, w: 540, h: 280, fill: quadrant.fill, stroke: 'transparent', rough: 0 }),
          textEl(quadrant.heading, quadrant.x + 28, quadrant.y + 24, 26),
          textEl(quadrant.prompt, quadrant.x + 28, quadrant.y + 72, 15, C.muted),
          textEl(quadrant.lines, quadrant.x + 28, quadrant.y + 120, 16),
        )
      })
      elements.push(textEl('Pick one strength to double down on this quarter.', 40, 760, 15, C.faint))
      return elements
    },
  },
  {
    id: 'retro',
    name: 'Sprint retrospective',
    description: 'Start, stop and continue — then leave with owners.',
    category: 'Teams',
    accent: '#d6336c',
    icon: 'retro',
    build: () => {
      const columns = [
        { x: 40, fill: C.green, heading: 'Start', prompt: 'What should we try?' },
        { x: 440, fill: C.red, heading: 'Stop', prompt: 'What slows us down?' },
        { x: 840, fill: C.blue, heading: 'Continue', prompt: 'What worked well?' },
      ]
      const elements: Skeleton[] = [
        title('Sprint retrospective'),
        subtitle('Speak in observations, not accusations.'),
      ]
      columns.forEach((column) => {
        elements.push(
          rect({ x: column.x, y: 140, w: 360, h: 470, fill: C.panel, stroke: C.hairline, rough: 0 }),
          rect({ x: column.x + 20, y: 160, w: 320, h: 52, fill: column.fill, stroke: 'transparent', text: column.heading, size: 20, rough: 0 }),
          textEl(column.prompt, column.x + 22, 230, 14, C.muted),
          sticky('', column.x + 20, 265, C.paper, 320, 120),
          sticky('', column.x + 20, 400, C.paper, 320, 120),
          sticky('', column.x + 20, 535, C.paper, 320, 60),
        )
      })
      elements.push(
        rect({ x: 40, y: 650, w: 1160, h: 110, fill: C.yellow, stroke: 'transparent', rough: 0 }),
        textEl('Action items', 62, 668, 19),
        textEl('1. Owner — task — due date', 62, 705, 14),
        textEl('2. Owner — task — due date', 460, 705, 14),
        textEl('3. Owner — task — due date', 860, 705, 14),
      )
      return elements
    },
  },
  {
    id: 'meeting',
    name: 'Meeting notes',
    description: 'Agenda, notes, decisions and action items in one page.',
    category: 'Teams',
    accent: '#1c7ed6',
    icon: 'meeting',
    build: () => [
      title('Meeting notes'),
      subtitle('If it is not written down, it did not happen.'),
      rect({ x: 40, y: 130, w: 360, h: 70, fill: C.panel, stroke: C.hairline, text: 'Date\n—', size: 14, rough: 0 }),
      rect({ x: 430, y: 130, w: 360, h: 70, fill: C.panel, stroke: C.hairline, text: 'Attendees\n—', size: 14, rough: 0 }),
      rect({ x: 820, y: 130, w: 380, h: 70, fill: C.panel, stroke: C.hairline, text: 'Goal\n—', size: 14, rough: 0 }),
      rect({ x: 40, y: 230, w: 360, h: 300, fill: C.paper, stroke: C.hairline, rough: 0 }),
      textEl('Agenda', 62, 248, 20),
      textEl('1. Context (10 min)', 62, 295, 15),
      textEl('2. Decisions (20 min)', 62, 335, 15),
      textEl('3. Open questions (15 min)', 62, 375, 15),
      textEl('4. Next steps (10 min)', 62, 415, 15),
      rect({ x: 430, y: 230, w: 770, h: 190, fill: C.paper, stroke: C.hairline, rough: 0 }),
      textEl('Notes', 452, 248, 20),
      textEl('Key points, context, and open threads…', 452, 295, 15, C.faint),
      rect({ x: 430, y: 450, w: 770, h: 80, fill: C.blue, stroke: 'transparent', rough: 0 }),
      textEl('Decisions', 452, 464, 17),
      textEl('—', 452, 492, 14, C.muted),
      rect({ x: 40, y: 560, w: 1160, h: 180, fill: C.paper, stroke: C.hairline, rough: 0 }),
      textEl('Action items', 62, 578, 20),
      textEl('Owner', 62, 620, 13, C.faint),
      textEl('Task', 260, 620, 13, C.faint),
      textEl('Due', 1040, 620, 13, C.faint),
      polyline([[62, 642], [1160, 642]], C.hairline),
      textEl('☐', 62, 665, 15),
      textEl('☐', 62, 705, 15),
    ],
  },
  {
    id: 'weekly',
    name: 'Weekly planner',
    description: 'Seven days, three priorities, one focused week.',
    category: 'Planning',
    accent: '#fab005',
    icon: 'week',
    build: () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const fills = [C.blue, C.green, C.yellow, C.orange, C.red, C.purple, C.teal]
      const elements: Skeleton[] = [
        title('Weekly planner'),
        subtitle('Three priorities a day beats a list of twenty.'),
      ]
      days.forEach((day, index) => {
        const x = 40 + index * 160
        elements.push(
          rect({ x, y: 140, w: 150, h: 580, fill: C.paper, stroke: C.hairline, rough: 0 }),
          rect({ x, y: 140, w: 150, h: 52, fill: fills[index], stroke: 'transparent', text: day.slice(0, 3), size: 16, rough: 0 }),
          sticky('', x + 10, 210, C.panel, 130, 120, 12),
          sticky('', x + 10, 350, C.panel, 130, 120, 12),
          sticky('', x + 10, 490, C.panel, 130, 120, 12),
        )
      })
      elements.push(
        rect({ x: 40, y: 745, w: 1150, h: 80, fill: C.yellow, stroke: 'transparent', text: "This week's focus:  ________________________________________", size: 20, align: 'left', rough: 0 }),
      )
      return elements
    },
  },
  {
    id: 'study',
    name: 'Cornell study notes',
    description: 'Cues, notes and a summary for active recall.',
    category: 'Study',
    accent: '#7048e8',
    icon: 'study',
    build: () => {
      const elements: Skeleton[] = [
        title('Cornell study notes'),
        subtitle('Cover the notes. Answer the cues. Then summarize.'),
        rect({ x: 40, y: 120, w: 1120, h: 650, fill: C.paper, stroke: C.ink, strokeWidth: 1.5, rough: 0 }),
        textEl('Course / topic', 70, 142, 18),
        textEl('Date', 930, 142, 14, C.faint),
        rect({ x: 40, y: 190, w: 280, h: 470, fill: C.panel, stroke: C.hairline, round: false, rough: 0 }),
        textEl('Cues & questions', 62, 210, 17),
        rect({ x: 62, y: 255, w: 236, h: 78, fill: C.paper, stroke: C.line, strokeStyle: 'dashed', text: 'Key question', size: 13, textColor: C.faint, rough: 0 }),
        rect({ x: 62, y: 355, w: 236, h: 78, fill: C.paper, stroke: C.line, strokeStyle: 'dashed', text: 'Definition', size: 13, textColor: C.faint, rough: 0 }),
        rect({ x: 62, y: 455, w: 236, h: 78, fill: C.paper, stroke: C.line, strokeStyle: 'dashed', text: 'Why it matters', size: 13, textColor: C.faint, rough: 0 }),
        rect({ x: 62, y: 555, w: 236, h: 78, fill: C.paper, stroke: C.line, strokeStyle: 'dashed', text: 'Recall prompt', size: 13, textColor: C.faint, rough: 0 }),
        textEl('Notes', 342, 210, 17),
        ...Array.from({ length: 7 }, (_, index) => polyline([[342, 265 + index * 55], [1130, 265 + index * 55]], C.hairline, false, 1)),
        rect({ x: 40, y: 680, w: 1120, h: 90, fill: C.yellow, stroke: 'transparent', rough: 0 }),
        textEl('Summary', 62, 694, 15),
        textEl('Write the whole idea in two sentences, from memory.', 62, 722, 14, C.muted),
        textEl('Active recall beats re-reading.', 40, 795, 14, C.faint),
      ]
      return elements
    },
  },
  {
    id: 'roadmap',
    name: 'Product roadmap',
    description: 'Sequence initiatives by quarter and outcome.',
    category: 'Planning',
    accent: '#0ca678',
    icon: 'roadmap',
    build: () => {
      const quarters = [
        { x: 190, y: 230, fill: C.blue, quarter: 'Q1', focus: 'Foundation', outcome: 'Ship the core loop' },
        { x: 440, y: 475, fill: C.green, quarter: 'Q2', focus: 'Retention', outcome: 'Make the habit stick' },
        { x: 690, y: 230, fill: C.yellow, quarter: 'Q3', focus: 'Collaboration', outcome: 'Bring in teams' },
        { x: 940, y: 475, fill: C.orange, quarter: 'Q4', focus: 'Scale', outcome: 'Automate the boring parts' },
      ]
      const elements: Skeleton[] = [
        title('Product roadmap'),
        subtitle('Outcomes over features. Progress over promises.'),
        arrow(70, 420, 1160, 420, C.ink, false, true),
        ...quarters.map((quarter) =>
          rect({ x: quarter.x + 90, y: 404, w: 20, h: 20, fill: quarter.fill, stroke: C.ink, rough: 0 }),
        ),
      ]
      quarters.forEach((quarter) => {
        const above = quarter.y < 420
        elements.push(
          rect({ x: quarter.x, y: quarter.y, w: 200, h: 140, fill: quarter.fill, stroke: 'transparent', rough: 0 }),
          textEl(quarter.quarter, quarter.x + 20, quarter.y + 16, 14),
          textEl(quarter.focus, quarter.x + 20, quarter.y + 42, 19),
          textEl(quarter.outcome, quarter.x + 20, quarter.y + 82, 13, C.muted),
          polyline(
            [
              [quarter.x + 100, above ? quarter.y + 140 : quarter.y],
              [quarter.x + 100, above ? 404 : 424],
            ],
            C.faint,
            true,
            1,
          ),
        )
      })
      elements.push(
        textEl('Now', 55, 432, 13, C.faint),
        textEl('Filter ruthlessly: what moves the metric?', 70, 760, 14, C.faint),
      )
      return elements
    },
  },
  {
    id: 'org',
    name: 'Org chart',
    description: 'Show who owns what and how teams connect.',
    category: 'Diagrams',
    accent: '#5f3dc4',
    icon: 'org',
    build: () => {
      const leads = [
        { x: 150, fill: C.blue, label: 'Product' },
        { x: 500, fill: C.green, label: 'Engineering' },
        { x: 850, fill: C.orange, label: 'Design' },
      ]
      const elements: Skeleton[] = [
        title('Org chart'),
        subtitle('Every box needs a clear owner and scope.'),
        rect({ x: 500, y: 130, w: 200, h: 80, fill: C.purple, stroke: 'transparent', text: 'CEO\nName', size: 18, rough: 0 }),
      ]
      leads.forEach((lead) => {
        elements.push(
          rect({ x: lead.x, y: 290, w: 200, h: 80, fill: lead.fill, stroke: 'transparent', text: `${lead.label}\nName`, size: 16, rough: 0 }),
          rect({ x: lead.x - 20, y: 440, w: 160, h: 70, fill: C.paper, stroke: C.hairline, text: 'Team 1', size: 15, rough: 0 }),
          rect({ x: lead.x + 160, y: 440, w: 160, h: 70, fill: C.paper, stroke: C.hairline, text: 'Team 2', size: 15, rough: 0 }),
          polyline([[lead.x + 100, 370], [lead.x + 100, 405], [lead.x + 60, 405], [lead.x + 60, 440]], C.line),
          polyline([[lead.x + 100, 405], [lead.x + 240, 405], [lead.x + 240, 440]], C.line),
        )
      })
      elements.push(
        polyline([[600, 210], [600, 250]], C.line),
        polyline([[250, 250], [950, 250]], C.line),
        polyline([[250, 250], [250, 290]], C.line),
        polyline([[600, 250], [600, 290]], C.line),
        polyline([[950, 250], [950, 290]], C.line),
        textEl('Double-click a label to rename it.', 40, 570, 14, C.faint),
      )
      return elements
    },
  },
  {
    id: 'storyboard',
    name: 'Storyboard',
    description: 'Six scenes from first moment to payoff.',
    category: 'Product',
    accent: '#f76707',
    icon: 'storyboard',
    build: () => {
      const elements: Skeleton[] = [
        title('Storyboard'),
        subtitle('Six panels. One clear story. Show the change.'),
      ]
      const captions = ['First moment', 'The friction', 'The idea', 'First try', 'The payoff', 'Next time']
      for (let index = 0; index < 6; index += 1) {
        const x = 40 + (index % 3) * 400
        const y = 140 + Math.floor(index / 3) * 280
        elements.push(
          rect({ x, y, w: 360, h: 230, fill: C.paper, stroke: C.ink, strokeWidth: 1.25, rough: 0 }),
          rect({ x: x + 16, y: y + 16, w: 52, h: 30, fill: C.yellow, stroke: 'transparent', text: String(index + 1), size: 14, rough: 0 }),
          textEl(captions[index], x + 82, y + 22, 17),
          textEl('Sketch the moment…', x + 24, y + 90, 14, C.faint),
          polyline([[x, y + 175], [x + 360, y + 175]], C.hairline),
          textEl('Action / dialogue', x + 18, y + 190, 12, C.faint),
        )
      }
      elements.push(textEl('Rule of thumb: one idea per panel.', 40, 740, 14, C.faint))
      return elements
    },
  },
  {
    id: 'venn',
    name: 'Venn diagram',
    description: 'Find the overlap between users, business and technology.',
    category: 'Diagrams',
    accent: '#1098ad',
    icon: 'venn',
    build: () => [
      title('Venn diagram'),
      subtitle('The sweet spot is where all three overlap.'),
      ellipse({ x: 200, y: 170, w: 420, h: 420, fill: C.blue, stroke: '#1c7ed6', text: '', opacity: 45, rough: 0 }),
      ellipse({ x: 380, y: 170, w: 420, h: 420, fill: C.yellow, stroke: '#e8a300', text: '', opacity: 45, rough: 0 }),
      ellipse({ x: 290, y: 320, w: 420, h: 420, fill: C.green, stroke: '#2f9e44', text: '', opacity: 45, rough: 0 }),
      textEl('Users', 250, 240, 22, '#1864ab'),
      textEl('What they need', 250, 272, 13, '#1864ab'),
      textEl('Business', 690, 240, 22, '#9c6f00'),
      textEl('What sustains us', 690, 272, 13, '#9c6f00'),
      textEl('Technology', 430, 660, 22, '#2b8a3e'),
      textEl('What we can build', 430, 692, 13, '#2b8a3e'),
      textEl('Opportunity', 470, 445, 24),
      rect({ x: 40, y: 780, w: 1120, h: 50, fill: C.panel, stroke: 'transparent', text: 'Ask: is this desirable, viable AND feasible?', size: 15, textColor: C.muted, rough: 0 }),
    ],
  },
  {
    id: 'sequence',
    name: 'Sequence diagram',
    description: 'Trace a request across people, clients, services and data.',
    category: 'Diagrams',
    accent: '#c2255c',
    icon: 'sequence',
    build: () => {
      const actors = [
        { x: 150, fill: C.yellow, label: 'User' },
        { x: 430, fill: C.blue, label: 'Client' },
        { x: 710, fill: C.green, label: 'API' },
        { x: 990, fill: C.orange, label: 'Database' },
      ]
      const elements: Skeleton[] = [
        title('Sequence diagram'),
        subtitle('Time flows down. Arrows are messages.'),
      ]
      actors.forEach((actor) => {
        const center = actor.x + 90
        elements.push(
          rect({ x: actor.x, y: 130, w: 180, h: 60, fill: actor.fill, stroke: 'transparent', text: actor.label, size: 17, rough: 0 }),
          polyline([[center, 190], [center, 700]], C.line, true, 1.25),
        )
      })
      const messages: Array<[number, number, number, string, boolean]> = [
        [240, 520, 250, 'Open board', false],
        [520, 800, 330, 'Load board', false],
        [800, 1080, 410, 'Query data', false],
        [1080, 800, 490, 'Return rows', true],
        [800, 520, 570, 'Scene JSON', true],
        [520, 240, 650, 'Render canvas', true],
      ]
      messages.forEach(([fromX, toX, y, label, response]) => {
        elements.push(
          arrow(fromX, y, toX, y, response ? C.faint : C.ink, response, true),
          textEl(label, Math.min(fromX, toX) + 10, y - 24, 13, response ? C.faint : C.ink),
        )
      })
      elements.push(
        rect({ x: 40, y: 745, w: 320, h: 42, fill: C.panel, stroke: 'transparent', text: 'Dashed arrows are responses', size: 13, textColor: C.muted, rough: 0 }),
      )
      return elements
    },
  },
  {
    id: 'deck',
    name: 'Slide deck',
    description: 'Four frames you can present one slide at a time.',
    category: 'Presenting',
    accent: '#364fc7',
    icon: 'deck',
    build: () => [
      ...slide(1, 40, 100, 'Your big idea', ['A one-line promise goes here.', 'Presenter · date'], C.blue),
      ...slide(2, 1040, 100, 'The problem', ['Who feels the pain?', 'What does it cost today?', 'Why now?'], C.red),
      ...slide(3, 2040, 100, 'Our approach', ["What we're building", "Why it's different", 'Proof it works'], C.green),
      ...slide(4, 3040, 100, 'Next steps', ['Decision needed', 'Owner and date', 'How we measure success'], C.yellow),
    ],
  },
]

const TEMPLATE_MAP = new Map(TEMPLATES.map((template) => [template.id, template]))

let fontPromise: Promise<void> | null = null

// Text widths are baked in during conversion, so the hand-drawn face must be
// loaded first or long labels render clipped to a fallback-font width.
export function prepareTemplateFonts(): Promise<void> {
  if (!fontPromise) {
    fontPromise = (async () => {
      if (typeof document === 'undefined' || !document.fonts) return
      const sample = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ·—…'
      await document.fonts.load('16px Excalifont', sample)
      await document.fonts.ready
    })().catch(() => undefined)
  }
  return fontPromise
}

export function getTemplate(id: string): TemplateDef {
  return TEMPLATE_MAP.get(id) ?? TEMPLATES[0]
}

export function sceneForTemplate(id: string): SceneData {
  const template = getTemplate(id)
  const skeleton = template.build()
  const elements = skeleton.length
    ? convertToExcalidrawElements(skeleton, { regenerateIds: true })
    : []
  return {
    elements,
    appState: { ...blankScene().appState },
    files: {} as BinaryFiles,
  }
}
