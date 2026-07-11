import { useCallback } from 'react'
import { Download } from 'lucide-react'
import { useProgrammeStore } from '../../store/programmeStore'
import type { Activity } from '../../models'

function activitiesToCSV(activities: Activity[]): string {
  const headers = [
    'WBS',
    'Name',
    'Duration',
    'Start',
    'Finish',
    'Status',
    'Percent Complete',
    'Total Float',
    'Critical',
    'Milestone',
    'WBS Level',
  ]

  const rows = activities.map((a) =>
    [
      a.wbsCode,
      `"${a.name.replace(/"/g, '""')}"`,
      a.duration,
      a.startDate || '',
      a.finishDate || '',
      a.status,
      a.percentComplete,
      a.totalFloat,
      a.isCritical ? 'Yes' : 'No',
      a.isMilestone ? 'Yes' : 'No',
      a.wbsLevel,
    ].join(','),
  )

  return [headers.join(','), ...rows].join('\n')
}

export default function CSVExport() {
  const activities = useProgrammeStore((s) => s.activities)
  const project = useProgrammeStore((s) => s.project)

  const handleExport = useCallback(() => {
    if (activities.length === 0) return

    const csv = activitiesToCSV(activities)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    const projectName = project?.name || 'programme'
    link.download = `${projectName.replace(/\s+/g, '_')}_export.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [activities, project])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Export Data</h2>

      <div className="bg-white border rounded-lg p-6">
        <p className="text-sm text-gray-600 mb-4">
          Export the current schedule data as a CSV file. This includes all activities with
          their computed dates, float values, and status.
        </p>

        {activities.length === 0 ? (
          <p className="text-sm text-gray-400">No data available to export. Import a CSV first.</p>
        ) : (
          <div className="space-y-2 mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{activities.length}</span> activities ready for export
            </div>
            {project && (
              <div className="text-sm text-gray-600">
                Project: <span className="font-medium">{project.name}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={activities.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={18} />
          Download CSV
        </button>
      </div>
    </div>
  )
}
