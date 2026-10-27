type AnyElement = any
type Point = { x: number; y: number }

const NODE_TYPES = new Set(['rectangle', 'ellipse', 'diamond'])
const CONNECTOR_TYPES = new Set(['line', 'arrow'])
const ATTACH_DISTANCE = 36

export type MindMapLayout = {
  elements: AnyElement[]
  moved: number
  hubId: string
}

function isLive(element: AnyElement): boolean {
  return Boolean(element && !element.isDeleted)
}

function centerOf(element: AnyElement): Point {
  return { x: element.x + element.width / 2, y: element.y + element.height / 2 }
}

function distanceToBox(point: Point, box: AnyElement): number {
  const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.width))
  const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.height))
  return Math.hypot(dx, dy)
}

function attachScore(point: Point, box: AnyElement): number {
  const edge = distanceToBox(point, box)
  if (edge > 0) return edge
  const center = centerOf(box)
  return Math.hypot(point.x - center.x, point.y - center.y) * 0.001
}

function boundaryPoint(node: AnyElement, toward: Point): Point {
  const center = centerOf(node)
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  if (!dx && !dy) return center

  if (node.type === 'ellipse') {
    const reach = 1 / Math.hypot(dx / (node.width / 2), dy / (node.height / 2))
    return { x: center.x + dx * reach, y: center.y + dy * reach }
  }

  const tx = dx === 0 ? Number.POSITIVE_INFINITY : node.width / 2 / Math.abs(dx)
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : node.height / 2 / Math.abs(dy)
  const reach = Math.min(tx, ty)
  return { x: center.x + dx * reach, y: center.y + dy * reach }
}

function toPoint(value: any): Point {
  if (Array.isArray(value)) return { x: Number(value[0]) || 0, y: Number(value[1]) || 0 }
  return { x: Number(value?.x) || 0, y: Number(value?.y) || 0 }
}

function endpointsOf(element: AnyElement): [Point, Point] {
  const points: Point[] =
    Array.isArray(element.points) && element.points.length >= 2
      ? element.points
      : [
          { x: 0, y: 0 },
          { x: element.width, y: element.height },
        ]
  const first = toPoint(points[0])
  const last = toPoint(points[points.length - 1])
  return [
    { x: element.x + first.x, y: element.y + first.y },
    { x: element.x + last.x, y: element.y + last.y },
  ]
}

function nearestNode(point: Point, nodes: AnyElement[]): AnyElement | null {
  let best: AnyElement | null = null
  let bestScore = ATTACH_DISTANCE
  for (const node of nodes) {
    const score = attachScore(point, node)
    if (score <= bestScore) {
      best = node
      bestScore = score
    }
  }
  return best
}

export function arrangeMindMap(elements: readonly AnyElement[]): MindMapLayout | null {
  const nodes = elements.filter(
    (element) =>
      isLive(element) && NODE_TYPES.has(element.type) && !element.frameId && element.width > 0 && element.height > 0,
  )
  if (nodes.length < 3) return null

  const connectors = elements.filter(
    (element) => isLive(element) && CONNECTOR_TYPES.has(element.type) && !element.frameId,
  )

  const connections = new Map<string, number>()
  for (const connector of connectors) {
    const [start, end] = endpointsOf(connector)
    for (const node of nodes) {
      if (attachScore(start, node) <= ATTACH_DISTANCE) {
        connections.set(node.id, (connections.get(node.id) ?? 0) + 1)
      }
      if (attachScore(end, node) <= ATTACH_DISTANCE) {
        connections.set(node.id, (connections.get(node.id) ?? 0) + 1)
      }
    }
  }

  const hub = [...nodes].sort(
    (a, b) =>
      (connections.get(b.id) ?? 0) - (connections.get(a.id) ?? 0) ||
      b.width * b.height - a.width * a.height,
  )[0]
  const hubCenter = centerOf(hub)
  const branches = nodes
    .filter((node) => node.id !== hub.id)
    .sort((a, b) => {
      const centerA = centerOf(a)
      const centerB = centerOf(b)
      return (
        Math.atan2(centerA.y - hubCenter.y, centerA.x - hubCenter.x) -
        Math.atan2(centerB.y - hubCenter.y, centerB.x - hubCenter.x)
      )
    })

  const widest = Math.max(...nodes.map((node) => node.width), 120)
  const tallest = Math.max(...nodes.map((node) => node.height), 60)
  const radiusX = Math.max(widest + 160, (widest * (branches.length + 1)) / Math.PI)
  const radiusY = radiusX * 0.62 + tallest / 2

  const updated = new Map<string, AnyElement>()
  for (const element of elements) updated.set(element.id, { ...element })

  let moved = 0
  branches.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / branches.length
    const targetX = hubCenter.x + Math.cos(angle) * radiusX - node.width / 2
    const targetY = hubCenter.y + Math.sin(angle) * radiusY - node.height / 2
    const dx = targetX - node.x
    const dy = targetY - node.y
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return

    const copy = updated.get(node.id)
    if (!copy) return
    copy.x = targetX
    copy.y = targetY
    moved += 1

    for (const bound of node.boundElements ?? []) {
      if (bound?.type !== 'text') continue
      const label = updated.get(bound.id)
      if (label) {
        label.x += dx
        label.y += dy
      }
    }
  })

  for (const connector of connectors) {
    if (connector.startBinding || connector.endBinding) continue
    const copy = updated.get(connector.id)
    if (!copy) continue
    const [oldStart, oldEnd] = endpointsOf(connector)
    const startNode = nearestNode(oldStart, nodes)
    const endNode = nearestNode(oldEnd, nodes)
    if (!startNode && !endNode) continue
    if (startNode && endNode && startNode.id === endNode.id) continue

    let newStart = oldStart
    let newEnd = oldEnd
    if (startNode && endNode) {
      const startCopy = updated.get(startNode.id)
      const endCopy = updated.get(endNode.id)
      newStart = boundaryPoint(startCopy, centerOf(endCopy))
      newEnd = boundaryPoint(endCopy, newStart)
    } else if (startNode) {
      newStart = boundaryPoint(updated.get(startNode.id), oldEnd)
    } else if (endNode) {
      newEnd = boundaryPoint(updated.get(endNode.id), oldStart)
    }

    if (
      Math.hypot(newStart.x - oldStart.x, newStart.y - oldStart.y) < 0.5 &&
      Math.hypot(newEnd.x - oldEnd.x, newEnd.y - oldEnd.y) < 0.5
    ) {
      continue
    }

    const points: Point[] =
      Array.isArray(copy.points) && copy.points.length >= 2
        ? copy.points
        : [
            { x: 0, y: 0 },
            { x: copy.width, y: copy.height },
          ]
    const mapped = points.map((point: any) => {
      const absolute = toPoint(point)
      return [connector.x + absolute.x - newStart.x, connector.y + absolute.y - newStart.y] as [number, number]
    })
    mapped[0] = [0, 0]
    mapped[mapped.length - 1] = [newEnd.x - newStart.x, newEnd.y - newStart.y]
    copy.x = newStart.x
    copy.y = newStart.y
    copy.points = mapped
    const xs = mapped.map((point) => point[0])
    const ys = mapped.map((point) => point[1])
    copy.width = Math.max(...xs) - Math.min(...xs)
    copy.height = Math.max(...ys) - Math.min(...ys)
  }

  return {
    elements: elements.map((element) => updated.get(element.id) ?? element),
    moved,
    hubId: hub.id,
  }
}
