import { useState, useCallback, useRef } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'
import { db } from '../../data/db'
import { schedule } from '../../engine/scheduler'
import { addDays } from '../../utils/date-utils'
import type { Activity } from '../../models'

type ColKey = 'wbs' | 'name' | 'dur' | 'start' | 'finish' | 'pct' | 'float' | 'status' | 'es' | 'ef' | 'ls' | 'lf'

interface ColDef {
  key: ColKey
  label: string
  width: number
  visible: boolean
  optional: boolean
}

const DEFAULT_COLS: ColDef[] = [
  { key: 'wbs', label: 'WBS Code', width: 76, visible: true, optional: false },
  { key: 'name', label: 'Activity Name', width: 999, visible: true, optional: false },
  { key: 'dur', label: 'Duration', width: 64, visible: true, optional: false },
  { key: 'start', label: 'Start Date', width: 90, visible: true, optional: false },
  { key: 'finish', label: 'Finish Date', width: 90, visible: true, optional: false },
  { key: 'pct', label: 'Percent', width: 56, visible: true, optional: false },
  { key: 'float', label: 'Float (Days)', width: 72, visible: false, optional: true },
  { key: 'status', label: 'Status', width: 80, visible: false, optional: true },
  { key: 'es', label: 'Early Start', width: 90, visible: false, optional: true },
  { key: 'ef', label: 'Early Finish', width: 90, visible: false, optional: true },
  { key: 'ls', label: 'Late Start', width: 90, visible: false, optional: true },
  { key: 'lf', label: 'Late Finish', width: 90, visible: false, optional: true },
]

export default function WBSTree() {
  const { activities } = useProgrammeStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set(activities.filter(a => a.wbsLevel === 1).map(a => a.wbsCode)))
  const [cols, setCols] = useState<ColDef[]>(DEFAULT_COLS)
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const resizing = useRef<{ key: ColKey; startX: number; startW: number } | null>(null)

  // Edit modal state
  const [editId, setEditId] = useState<string | null>(null)
  const [editWbs, setEditWbs] = useState('')
  const [editName, setEditName] = useState('')
  const [editDur, setEditDur] = useState('0')
  const [editStart, setEditStart] = useState('')
  const [editFinish, setEditFinish] = useState('')
  const [editPct, setEditPct] = useState('0')
  const [editStatus, setEditStatus] = useState('not_started')
  const [editMilestone, setEditMilestone] = useState(false)
  const [editActualStart, setEditActualStart] = useState('')
  const [editActualFinish, setEditActualFinish] = useState('')
  const [editPreds, setEditPreds] = useState('')
  const [statusManuallySet, setStatusManuallySet] = useState(false)

  const toggleCol = (key: ColKey) => {
    setCols(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  }

  const startResize = useCallback((e: React.MouseEvent, key: ColKey) => {
    e.preventDefault()
    e.stopPropagation()
    const col = cols.find(c => c.key === key)
    if (!col) return
    resizing.current = { key, startX: e.clientX, startW: col.width }
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [cols])

  const onResize = (e: MouseEvent) => {
    if (!resizing.current) return
    const dx = e.clientX - resizing.current.startX
    const newW = Math.max(30, resizing.current.startW + dx)
    setCols(prev => prev.map(c => c.key === resizing.current!.key ? { ...c, width: newW } : c))
  }

  const stopResize = () => {
    resizing.current = null
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

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
    setEditWbs(a.wbsCode)
    setEditName(a.name)
    setEditDur(String(a.duration))
    setEditStart(a.startDate || '')
    setEditFinish(a.finishDate || '')
    setEditPct(String(a.percentComplete))
    setEditStatus(a.status)
    setEditMilestone(a.isMilestone)
    setEditActualStart(a.actualStart || '')
    setEditActualFinish(a.actualFinish || '')
    setStatusManuallySet(false)

    // #6: Load current predecessors from dependencies
    const { dependencies } = useProgrammeStore.getState()
    const wbsToId = new Map(activities.map(act => [act.id, act.wbsCode]))
    const preds = dependencies.filter(d => d.successorId === id)
    const predWbsCodes = preds.map(d => wbsToId.get(d.predecessorId) || d.predecessorId)
    setEditPreds(predWbsCodes.join('; '))
  }

  // #8: When start changes, auto-recalculate finish = start + duration
  const handleStartChange = (val: string) => {
    setEditStart(val)
    const dur = parseInt(editDur) || 0
    if (val && dur > 0) {
      setEditFinish(addDays(val, dur))
    }
  }

  // When duration changes, auto-recalculate finish = start + duration
  const handleDurChange = (val: string) => {
    setEditDur(val)
    const dur = parseInt(val) || 0
    if (editStart && dur >= 0) {
      setEditFinish(addDays(editStart, dur))
    }
  }

  // When finish changes, back-calculate duration = finish - start
  const handleFinishChange = (val: string) => {
    setEditFinish(val)
    if (editStart && val) {
      const startTs = new Date(editStart + 'T00:00:00Z').getTime()
      const finishTs = new Date(val + 'T00:00:00Z').getTime()
      const diffDays = Math.round((finishTs - startTs) / 86400000)
      if (diffDays >= 0) {
        setEditDur(String(diffDays))
      }
    }
  }

  // Actual Start set → auto-derive status = in_progress
  const handleActualStartChange = (val: string) => {
    setEditActualStart(val)
    if (val && !statusManuallySet) {
      const pct = parseInt(editPct) || 0
      if (pct < 100) setEditStatus('in_progress')
    }
  }

  // Actual Finish set → auto % = 100, status = completed, finish = actual finish
  const handleActualFinishChange = (val: string) => {
    setEditActualFinish(val)
    if (val) {
      if (!statusManuallySet) setEditStatus('completed')
      setEditPct('100')
      // Also update planned finish to match actual if finish was empty or earlier
      if (!editFinish || val > editFinish) {
        setEditFinish(val)
      }
    } else {
      // Cleared actual finish → revert status if not manually set
      if (!statusManuallySet) {
        const pct = parseInt(editPct) || 0
        if (pct >= 100) setEditPct('99')
        setEditStatus(editActualStart ? 'in_progress' : 'not_started')
      }
    }
  }

  // #2: Milestone toggle forces duration to 0
  const handleMilestoneToggle = (checked: boolean) => {
    setEditMilestone(checked)
    if (checked) {
      setEditDur('0')
      if (editStart) setEditFinish(editStart)
    }
  }

  // #4: Status only auto-derived if user hasn't manually changed it
  const handlePctChange = (val: string) => {
    setEditPct(val)
    if (!statusManuallySet) {
      const pct = parseInt(val) || 0
      if (pct >= 100) setEditStatus('completed')
      else if (pct > 0) setEditStatus('in_progress')
      else setEditStatus('not_started')
    }
  }

  const handleStatusChange = (val: string) => {
    setEditStatus(val)
    setStatusManuallySet(true)
  }

  const saveEdit = async () => {
    if (!editId) return
    let pct = parseInt(editPct) || 0
    const dur = parseInt(editDur) || 0
    let status: any = editStatus

    // Auto-derive from actual dates (highest priority unless manually overridden)
    if (!statusManuallySet) {
      if (editActualFinish) {
        status = 'completed'
        pct = 100
      } else if (editActualStart) {
        status = 'in_progress'
        if (pct === 0) pct = 1  // in-progress must have >0%
      } else if (pct >= 100) {
        status = 'completed'
      } else if (pct > 0) {
        status = 'in_progress'
      } else {
        status = 'not_started'
      }
    }

    try {
      const store = useProgrammeStore.getState()
      const idx = store.activities.findIndex(a => a.id === editId)
      if (idx < 0) { setEditId(null); return }

      const updated = [...store.activities]
      const orig = updated[idx]

      // #7: DON'T clear other SNET locks — CPM forward pass handles multiple SNET correctly

      // Build updated activity
      const newWbs = editWbs.trim() || orig.wbsCode
      const newName = editName.trim() || orig.name
      const newStart = editStart || null
      const newFinish = editFinish || null

      // Three-way date resolution:
      // - Milestone: duration=0, finish=start
      // - Start changed: duration stays, finish = start + duration
      // - Finish changed: start stays, duration = finish - start
      // - Duration changed: start stays, finish = start + duration
      let finalDur: number
      let finalStart = newStart
      let finalFinish = newFinish

      if (editMilestone) {
        finalDur = 0
        if (finalStart) finalFinish = finalStart
      } else {
        const origStart = orig.startDate || ''
        const origFinish = orig.finishDate || ''
        const origDur = orig.duration || 0

        const startChanged = !!newStart && newStart !== origStart
        const finishChanged = !!newFinish && newFinish !== origFinish
        const durChanged = dur !== origDur

        if (startChanged && !durChanged && !finishChanged) {
          // Start moved → keep duration, recalc finish
          finalDur = origDur
          finalFinish = addDays(newStart!, origDur)
        } else if (finishChanged && !durChanged && !startChanged) {
          // Finish moved → keep start, recalc duration
          finalStart = origStart || null
          const startTs = new Date((origStart || newStart)! + 'T00:00:00Z').getTime()
          const finishTs = new Date(newFinish! + 'T00:00:00Z').getTime()
          finalDur = Math.max(0, Math.round((finishTs - startTs) / 86400000))
        } else if (durChanged && !startChanged) {
          // Duration changed → keep start, recalc finish
          finalDur = dur
          if (finalStart) finalFinish = addDays(finalStart, dur)
        } else if (startChanged && durChanged) {
          // Both start and duration changed → recalc finish
          finalDur = dur
          finalFinish = addDays(newStart!, dur)
        } else {
          // Nothing changed or all changed — use as-is
          finalDur = dur
          if (finalStart && finalDur >= 0) {
            finalFinish = addDays(finalStart, finalDur)
          }
        }
      }

      updated[idx] = {
        ...orig,
        wbsCode: newWbs,
        name: newName,
        duration: finalDur,
        startDate: finalStart,
        finishDate: finalFinish,
        percentComplete: pct,
        status,
        isMilestone: editMilestone,
        actualStart: editActualStart || null,
        actualFinish: editActualFinish || null,
        constraintType: finalStart ? 'SNET' : 'ASAP',
        constraintDate: finalStart || null,
      }

      // #6: Update dependencies — parse predecessors and rebuild
      const { dependencies: existingDeps, project } = store
      const projectId = orig.projectId

      // Delete existing deps where this activity is successor
      const toDelete = existingDeps.filter(d => d.successorId === editId).map(d => d.id)
      for (const depId of toDelete) {
        await db.dependencies.delete(depId)
      }
      let newDeps = existingDeps.filter(d => !toDelete.includes(d.id))

      // Parse new predecessors
      const wbsToId = new Map(updated.map(a => [a.wbsCode, a.id]))
      if (editPreds.trim()) {
        const predCodes = editPreds.split(/[;,]/).map(s => s.trim()).filter(Boolean)
        for (const code of predCodes) {
          const predId = wbsToId.get(code)
          if (predId && predId !== editId) {
            const depId = crypto.randomUUID()
            const dep = { id: depId, projectId, predecessorId: predId, successorId: editId, relationType: 'FS' as const, lagDays: 0 }
            newDeps = [...newDeps, dep]
            await db.dependencies.put(dep as any)
          }
        }
      }

      // Persist activity to DB
      await db.activities.put(updated[idx] as any)

      // Run CPM
      const projectStart = project?.dataDate || new Date().toISOString().slice(0, 10)
      const result = schedule(updated, newDeps, projectStart)

      for (const a of result.activities) { try { await db.activities.put(a as any) } catch {} }

      useProgrammeStore.setState({ activities: result.activities, dependencies: newDeps, scheduleResult: result })
      setEditId(null)
    } catch (e: any) { alert('Save failed: ' + (e?.message || String(e))) }
  }

  const renderCell = (act: Activity, key: ColKey) => {
    switch (key) {
      case 'wbs': return <span className="font-mono text-gray-400">{act.wbsCode}</span>
      case 'name': return <span className="truncate">{act.name}</span>
      case 'dur': return <span className="text-gray-500">{act.duration}d</span>
      case 'start': return <span className="text-gray-500 font-mono text-xs">{act.startDate?.slice(5) || '--'}</span>
      case 'finish': return <span className="text-gray-500 font-mono text-xs">{act.finishDate?.slice(5) || '--'}</span>
      case 'pct': return <span className="text-gray-500">{act.percentComplete}%</span>
      case 'float':
        return (
          <span className={`px-1 py-0.5 rounded text-xs font-medium ${
            act.isCritical ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-600'
          }`}>
            {act.isCritical ? 'CP' : `${act.totalFloat}d`}
          </span>
        )
      case 'status': return <span className="text-gray-400 text-xs capitalize">{act.status.replace('_', ' ')}</span>
      case 'es': return <span className="text-gray-400 font-mono text-xs">{act.earlyStart?.slice(5) || '--'}</span>
      case 'ef': return <span className="text-gray-400 font-mono text-xs">{act.earlyFinish?.slice(5) || '--'}</span>
      case 'ls': return <span className="text-gray-400 font-mono text-xs">{act.lateStart?.slice(5) || '--'}</span>
      case 'lf': return <span className="text-gray-400 font-mono text-xs">{act.lateFinish?.slice(5) || '--'}</span>
    }
  }

  const renderRow = (act: typeof activities[0], depth: number = 0) => {
    const kids = children(act.wbsCode)
    const hasKids = kids.length > 0
    const isExpanded = expanded.has(act.wbsCode)
    const visibleCols = cols.filter(c => c.visible)

    return (
      <div key={act.id}>
        <div className="flex items-center py-1 px-2 hover:bg-gray-50 border-b border-gray-100 text-xs cursor-pointer"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => openEdit(act.id)}>
          {hasKids && (
            <span onClick={e => { e.stopPropagation(); toggle(act.wbsCode) }} className="mr-1 w-4 text-gray-400 cursor-pointer select-none flex-shrink-0">
              {isExpanded ? '▾' : '▸'}
            </span>
          )}
          {!hasKids && <span className="w-4 mr-1 flex-shrink-0" />}
          {visibleCols.map(col => (
            <div key={col.key} className="flex-shrink-0 overflow-hidden" style={{ width: col.width === 999 ? undefined : col.width, flex: col.width === 999 ? '1 1 0%' : undefined }}>
              {col.key === 'name' ? (
                <span className="truncate block">{act.name}</span>
              ) : (
                <span className="text-center block">{renderCell(act, col.key)}</span>
              )}
            </div>
          ))}
        </div>
        {hasKids && isExpanded && kids.map(k => renderRow(k, depth + 1))}
      </div>
    )
  }

  if (activities.length === 0) {
    return <div className="p-6 text-gray-400 text-sm">No activities. Import a CSV first.</div>
  }

  const visibleCols = cols.filter(c => c.visible)
  const optionalCols = cols.filter(c => c.optional)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">WBS Tree</h2>
        <div className="relative">
          <button onClick={() => setColMenuOpen(!colMenuOpen)}
            className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            Columns
          </button>
          {colMenuOpen && (
            <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg p-2 z-40 w-44"
              onMouseLeave={() => setColMenuOpen(false)}>
              {optionalCols.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer text-xs">
                  <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)} />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">Click any row to edit. Drag column borders to resize.</p>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
        <div className="flex items-center py-2 px-2 bg-gray-50 border-b font-semibold text-xs text-gray-500 sticky top-0 z-10">
          <span className="w-4 mr-1 flex-shrink-0" />
          {visibleCols.map(col => (
            <div key={col.key} className="flex-shrink-0 text-center overflow-hidden relative group"
              style={{ width: col.width === 999 ? undefined : col.width, flex: col.width === 999 ? '1 1 0%' : undefined }}>
              <span>{col.label}</span>
              <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-purple-200 group-hover:bg-purple-100"
                onMouseDown={(e) => startResize(e, col.key)} />
            </div>
          ))}
        </div>
        {rootActs.map(a => renderRow(a))}
      </div>

      {/* Edit modal */}
      {editId && (() => {
        return (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditId(null)}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-[440px] max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-gray-500">WBS Code</label>
                  <input type="text" value={editWbs} onChange={e => setEditWbs(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1 font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Duration (days)</label>
                  <input type="number" min="0" value={editDur} onChange={e => handleDurChange(e.target.value)}
                    disabled={editMilestone}
                    className="w-full border rounded px-2 py-1 text-sm mt-1 disabled:bg-gray-100 disabled:text-gray-400" />
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs text-gray-500">Activity Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <input type="date" value={editStart} onChange={e => handleStartChange(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Finish Date</label>
                  <input type="date" value={editFinish} onChange={e => handleFinishChange(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500">Actual Start</label>
                  <input type="date" value={editActualStart} onChange={e => handleActualStartChange(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Actual Finish</label>
                  <input type="date" value={editActualFinish} onChange={e => handleActualFinishChange(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1" />
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs text-gray-500">% Complete</label>
                <input type="range" min="0" max="100" value={editPct} onChange={e => handlePctChange(e.target.value)}
                  className="w-full mt-1" />
                <div className="text-center text-sm font-bold">{editPct}%</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <select value={editStatus} onChange={e => handleStatusChange(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm mt-1">
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={editMilestone} onChange={e => handleMilestoneToggle(e.target.checked)}
                      className="rounded" />
                    Milestone
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-500">Predecessors (WBS codes, semicolon-separated)</label>
                <input type="text" value={editPreds} onChange={e => setEditPreds(e.target.value)}
                  placeholder="e.g. 1.1; 1.2"
                  className="w-full border rounded px-2 py-1 text-sm mt-1 font-mono" />
              </div>

              <div className="flex gap-2">
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
