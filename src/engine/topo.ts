import type { Activity, Dependency } from '../models'

export class CircularDependencyError extends Error {
  constructor(activityIds: string[]) {
    super(`Circular dependency detected involving: ${activityIds.join(' → ')}`)
    this.name = 'CircularDependencyError'
  }
}

/**
 * Topological sort using Kahn's algorithm (in-degree based).
 * Returns activity IDs in dependency order.
 * Throws CircularDependencyError if a cycle is detected.
 */
export function topologicalSort(activities: Activity[], dependencies: Dependency[]): string[] {
  if (activities.length === 0) return []

  // Build adjacency list and in-degree map
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const a of activities) {
    adj.set(a.id, [])
    inDegree.set(a.id, 0)
  }

  for (const dep of dependencies) {
    const pred = dep.predecessorId
    const succ = dep.successorId
    // Only count edges where both nodes are in our activity set
    if (adj.has(pred) && adj.has(succ)) {
      adj.get(pred)!.push(succ)
      inDegree.set(succ, (inDegree.get(succ) ?? 0) + 1)
    }
  }

  // Queue of nodes with in-degree 0
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const result: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    result.push(current)
    for (const neighbor of adj.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  if (result.length < activities.length) {
    // Cycle detected — find the cycle nodes for a useful error message
    const remaining = activities
      .map((a) => a.id)
      .filter((id) => !result.includes(id))
    throw new CircularDependencyError(remaining)
  }

  return result
}
