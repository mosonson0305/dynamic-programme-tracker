import { useMemo } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'

export default function CPList() {
  const activities = useProgrammeStore((s) => s.activities)
  const scheduleResult = useProgrammeStore((s) => s.scheduleResult)

  const { criticalPath, projectFinish } = useMemo(() => {
    if (!scheduleResult) return { criticalPath: [] as { id: string; wbsCode: string }[], projectFinish: '' }

    const activityMap = new Map(activities.map((a) => [a.id, a]))
    const cp = scheduleResult.criticalPath
      .map((id) => activityMap.get(id))
      .filter(Boolean)
      .map((a) => ({ id: a!.id, wbsCode: a!.wbsCode }))

    return {
      criticalPath: cp,
      projectFinish: scheduleResult.projectFinish,
    }
  }, [activities, scheduleResult])

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Critical Path</h3>

      {criticalPath.length === 0 ? (
        <div className="text-gray-400 text-sm">No critical path computed</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1 text-sm mb-3">
            {criticalPath.map((cp, idx) => (
              <span key={cp.id} className="inline-flex items-center gap-1">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  {cp.wbsCode}
                </span>
                {idx < criticalPath.length - 1 && (
                  <span className="text-gray-400 font-bold mx-0.5">&rarr;</span>
                )}
              </span>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            Project finish:{' '}
            <span className="font-semibold text-gray-700">{projectFinish}</span>
          </div>
        </>
      )}
    </div>
  )
}
