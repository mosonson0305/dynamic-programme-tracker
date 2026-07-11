import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useProgrammeStore } from '../../store/programmeStore'
import type { Activity } from '../../models'

/** Group activities by WBS level */
function buildWBSHierarchy(activities: Activity[]): Map<string, Activity[]> {
  const groups = new Map<string, Activity[]>()
  for (const a of activities) {
    const key = String(a.wbsLevel)
    const list = groups.get(key) || []
    list.push(a)
    groups.set(key, list)
  }

  // Sort WBS levels ascending
  return new Map(
    [...groups.entries()].sort(([a], [b]) => Number(a) - Number(b)),
  )
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return date.substring(5) // MM-DD
}

interface WBSRowProps {
  activity: Activity
  depth: number
}

function WBSRow({ activity, depth }: WBSRowProps) {
  const indent = depth * 20

  return (
    <div
      className="grid grid-cols-5 gap-2 px-3 py-1.5 text-sm border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
      style={{ paddingLeft: `${12 + indent}px` }}
    >
      <span className="font-mono text-xs text-gray-500 dark:text-gray-400 self-center">
        {activity.wbsCode}
      </span>
      <span className="truncate self-center">{activity.name}</span>
      <span className="text-xs self-center text-gray-600 dark:text-gray-300">
        {formatDate(activity.startDate)}
      </span>
      <span className="text-xs self-center text-gray-600 dark:text-gray-300">
        {formatDate(activity.finishDate)}
      </span>
      <span className="self-center">
        {activity.isCritical ? (
          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            CP
          </span>
        ) : (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {activity.totalFloat}d
          </span>
        )}
      </span>
    </div>
  )
}

interface WBSGroupProps {
  wbsLevel: string
  activities: Activity[]
}

function WBSGroup({ wbsLevel, activities }: WBSGroupProps) {
  const [expanded, setExpanded] = useState(true)
  const toggle = () => setExpanded((prev) => !prev)
  const iconSize = 16

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border-b border-gray-300 dark:border-gray-700"
      >
        {expanded ? <ChevronDown size={iconSize} /> : <ChevronRight size={iconSize} />}
        Level {wbsLevel}
        <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
          ({activities.length} activities)
        </span>
      </button>
      {expanded &&
        activities.map((a) => <WBSRow key={a.id} activity={a} depth={Number(wbsLevel)} />)}
    </div>
  )
}

export default function WBSTree() {
  const activities = useProgrammeStore((s) => s.activities)
  const hierarchy = useMemo(() => buildWBSHierarchy(activities), [activities])

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No activities to display. Import a CSV to see the WBS tree.
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-5 gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <span>WBS Code</span>
        <span>Activity Name</span>
        <span>Start</span>
        <span>Finish</span>
        <span>Float / CP</span>
      </div>
      {/* Body */}
      {[...hierarchy.entries()].map(([level, acts]) => (
        <WBSGroup key={level} wbsLevel={level} activities={acts} />
      ))}
    </div>
  )
}
