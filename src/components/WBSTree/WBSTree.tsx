import { useState } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'
import { db } from '../../data/db'

export default function WBSTree() {
  const { activities } = useProgrammeStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set(activities.filter(a => a.wbsLevel === 1).map(a => a.wbsCode)))
  const [editId, setEditId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editFinish, setEditFinish] = useState('')
  const [editPct, setEditPct] = useState('0')
  const [editStatus, setEditStatus] = useState('')

  const toggle = (wbs: string) => {
    const next = new Set(expanded)
    if (next.has(wbs)) next.delete(wbs); else next.add(wbs)
    setExpanded(next)
  }

  const rootActs = activities.filter(a => a.wbsLevel === 1).sort((a, b) => a.wbsCode.localeCompare(b.wbsCode))
  const children = (wbsCode: string) =>
    activities.filter(a => a.wbsCode.startsWith(wbsCode + '.') && a.wbsCode.split('.').length === wbsCode.split('.').length + 1)
      .sort((a, b) => a.wbsCode.localeCompare(b.wbsCode))

  const openEdit = (id: string) => {
    const a = activities.find(x => x.id === id)
    if (!a) return
    setEditId(id)
    setEditStart(a.startDate || '')
    setEditFinish(a.finishDate || '')
    setEditPct(String(a.percentComplete))
    setEditStatus(a.status)
  }

  const saveEdit = async () => {
    if (!editId) return

    const pct = parseInt(editPct) || 0
    let status: any = editStatus
    if (pct >= 100) status = 'completed'
    else if (pct > 0) status = 'in_progress'
    else status = 'not_started'

    try {
      const existing = await db.activities.get(editId)
      const base = existing || { id: editId, projectId: '', wbsCode: '', name: '', parentId: null, duration: 0,
        startDate: null, finishDate: null, actualStart: null, actualFinish: null,
        percentComplete: 0, earlyStart: null, earlyFinish: null, lateStart: null, lateFinish: null,
        totalFloat: 0, isCritical: false, isMilestone: false, constraintType: 'ASAP', constraintDate: null,
        status: 'not_started', wbsLevel: 1, bimRef: null, createdAt: '', updatedAt: '' }
      const merged = { ...base, startDate: editStart || null, finishDate: editFinish || null, percentComplete: pct, status }
      await db.activities.put(merged as any)

      // Update store in-memory directly
      const store = useProgrammeStore.getState()
      const idx = store.activities.findIndex(a => a.id === editId)
      if (idx >= 0) {
        const updated = [...store.activities]
        updated[idx] = { ...updated[idx], startDate: editStart || null, finishDate: editFinish || null, percentComplete: pct, status }
        console.log('[WBS EDIT] before:', store.activities[idx].finishDate, 'after:', updated[idx].finishDate, 'total activities:', updated.length)
        useProgrammeStore.setState({ activities: updated })
      } else {
        console.log('[WBS EDIT] activity not found in store! editId:', editId)
      }
      setEditId(null)
    } catch (e: any) {
      alert('Save failed: ' + (e?.message || String(e)))
    }
  }

  const renderRow = (act: typeof activities[0], depth: number = 0) => {
    const kids = children(act.wbsCode)
    const hasKids = kids.length > 0
    const isExpanded = expanded.has(act.wbsCode)

    return (
      <div key={act.id}>
        <div className="flex items-center py-1 px-2 hover:bg-gray-50 border-b border-gray-100 text-xs cursor-pointer"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => openEdit(act.id)}>
          {hasKids && (
            <span onClick={e => { e.stopPropagation(); toggle(act.wbsCode) }} className="mr-1 w-4 text-gray-400 cursor-pointer select-none">
              {isExpanded ? '▾' : '▸'}
            </span>
          )}
          {!hasKids && <span className="w-4 mr-1" />}
          <span className="font-mono text-gray-400 w-16">{act.wbsCode}</span>
          <span className="flex-1 truncate">{act.name}</span>
          <span className="text-gray-500 w-24 text-right font-mono">{act.startDate?.slice(5) || '--'}</span>
          <span className="text-gray-500 w-24 text-right font-mono">{act.finishDate?.slice(5) || '--'}</span>
          <span className="text-gray-500 w-10 text-right">{act.percentComplete}%</span>
          <span className="w-16 text-right">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              act.isCritical ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-600'
            }`}>
              {act.isCritical ? 'CP' : `${act.totalFloat}d`}
            </span>
          </span>
        </div>
        {hasKids && isExpanded && kids.map(k => renderRow(k, depth + 1))}
      </div>
    )
  }

  if (activities.length === 0) {
    return <div className="p-6 text-gray-400 text-sm">No activities. Import a CSV first.</div>
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-3">WBS Tree</h2>
      <p className="text-xs text-gray-400 mb-3">Click any row to edit dates and progress.</p>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
        <div className="flex items-center py-2 px-2 bg-gray-50 border-b font-semibold text-xs text-gray-500 sticky top-0">
          <span className="w-4 mr-1" />
          <span className="w-16">WBS</span>
          <span className="flex-1">Activity</span>
          <span className="w-24 text-right">Start</span>
          <span className="w-24 text-right">Finish</span>
          <span className="w-10 text-right">%</span>
          <span className="w-16 text-right">Float</span>
        </div>
        {rootActs.map(a => renderRow(a))}
      </div>

      {/* Edit modal */}
      {editId && (() => {
        const act = activities.find(x => x.id === editId)
        if (!act) return null
        return (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditId(null)}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-1">{act.wbsCode}</h3>
              <p className="text-sm text-gray-500 mb-4">{act.name}</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Finish Date</label>
                  <input type="date" value={editFinish} onChange={e => setEditFinish(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">% Complete</label>
                  <input type="range" min="0" max="100" value={editPct} onChange={e => setEditPct(e.target.value)}
                    className="w-full mt-1" />
                  <div className="text-center text-sm font-bold">{editPct}%</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1">
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={saveEdit}
                  className="flex-1 bg-purple-600 text-white py-2 rounded text-sm font-medium hover:bg-purple-700">
                  Save
                </button>
                <button onClick={() => setEditId(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded text-sm hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
