import { useState, useCallback, useRef } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'
import { db } from '../../data/db'
import { schedule } from '../../engine/scheduler'
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
  { key: 'wbs', label: 'WBS', width: 64, visible: true, optional: false },
  { key: 'name', label: 'Activity', width: 999, visible: true, optional: false },
  { key: 'dur', label: 'Dur', width: 40, visible: true, optional: false },
  { key: 'start', label: 'Start', width: 88, visible: true, optional: false },
  { key: 'finish', label: 'Finish', width: 88, visible: true, optional: false },
  { key: 'pct', label: '%', width: 36, visible: true, optional: false },
  { key: 'float', label: 'Float', width: 56, visible: false, optional: true },
  { key: 'status', label: 'Status', width: 72, visible: false, optional: true },
  { key: 'es', label: 'ES', width: 88, visible: false, optional: true },
  { key: 'ef', label: 'EF', width: 88, visible: false, optional: true },
  { key: 'ls', label: 'LS', width: 88, visible: false, optional: true },
  { key: 'lf', label: 'LF', width: 88, visible: false, optional: true },
]

export default function WBSTree() {
  const { activities } = useProgrammeStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set(activities.filter(a => a.wbsLevel === 1).map(a => a.wbsCode)))
  const [editId, setEditId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editFinish, setEditFinish] = useState('')
  const [editPct, setEditPct] = useState('0')
  const [editStatus, setEditStatus] = useState('')
  const [editMilestone, setEditMilestone] = useState(false)
  const [cols, setCols] = useState<ColDef[]>(DEFAULT_COLS)
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const resizing = useRef<{ key: ColKey; startX: number; startW: number } | null>(null)

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
    setEditStart(a.startDate || '')
    setEditFinish(a.finishDate || '')
    setEditPct(String(a.percentComplete))
    setEditStatus(a.status)
    setEditMilestone(a.isMilestone)
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
      const merged = { ...base, startDate: editStart || null, finishDate: editFinish || null, percentComplete: pct, status, isMilestone: editMilestone }
      await db.activities.put(merged as any)

      const store = useProgrammeStore.getState()
      const idx = store.activities.findIndex(a => a.id === editId)
      if (idx >= 0) {
        const updated = [...store.activities]
        for (let i = 0; i < updated.length; i++) {
          if (i !== idx) updated[i] = { ...updated[i], constraintType: 'ASAP', constraintDate: null }
        }
        let lockStart = editStart || null
        let lockFinish = editFinish || null
        const orig = updated[idx]
        if (!editStart && editFinish && editFinish !== orig.finishDate) {
          const finishTs = new Date(editFinish + 'T00:00:00Z').getTime()
          const startTs = finishTs - (orig.duration || 1) * 86400000
          lockStart = new Date(startTs).toISOString().slice(0, 10)
          lockFinish = editFinish
        }
        updated[idx] = { ...orig, startDate: lockStart, finishDate: lockFinish, percentComplete: pct, status, isMilestone: editMilestone, constraintType: lockStart ? 'SNET' : 'ASAP', constraintDate: lockStart || null }
        const { dependencies } = useProgrammeStore.getState()
        const project = useProgrammeStore.getState().project
        const projectStart = project?.dataDate || new Date().toISOString().slice(0, 10)
        const result = schedule(updated, dependencies, projectStart)
        for (const a of result.activities) { try { await db.activities.put(a as any) } catch {} }
        useProgrammeStore.setState({ activities: result.activities, scheduleResult: result })
      }
      setEditId(null)
    } catch (e: any) { alert('Save failed: ' + (e?.message || String(e))) }
  }

  // Render a single cell value for a column
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
                <span className="text-right block">{renderCell(act, col.key)}</span>
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
            ☰ Columns
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
        {/* Header */}
        <div className="flex items-center py-2 px-2 bg-gray-50 border-b font-semibold text-xs text-gray-500 sticky top-0 z-10">
          <span className="w-4 mr-1 flex-shrink-0" />
          {visibleCols.map(col => (
            <div key={col.key} className="flex-shrink-0 text-right overflow-hidden relative group"
              style={{ width: col.width === 999 ? undefined : col.width, flex: col.width === 999 ? '1 1 0%' : undefined }}>
              <span>{col.label}</span>
              {/* Resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-purple-200 group-hover:bg-purple-100"
                onMouseDown={(e) => startResize(e, col.key)}
              />
            </div>
          ))}
        </div>
        {/* Rows */}
        {rootActs.map(a => renderRow(a))}
      </div>

      {/* Edit modal — unchanged */}
      {editId && (() => {
        const act = activities.find(x => x.id === editId)
        if (!act) return null
        return (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditId(null)}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-1">{act.wbsCode}</h3>
              <p className="text-sm text-gray-500 mb-4">{act.name}</p>
              <div className="space-y-3">
                <div><label className="text-xs text-gray-500">Start Date</label><input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} className="w-full border rounded px-2 py-1 text-sm mt-1" /></div>
                <div><label className="text-xs text-gray-500">Finish Date</label><input type="date" value={editFinish} onChange={e => setEditFinish(e.target.value)} className="w-full border rounded px-2 py-1 text-sm mt-1" /></div>
                <div><label className="text-xs text-gray-500">% Complete</label><input type="range" min="0" max="100" value={editPct} onChange={e => setEditPct(e.target.value)} className="w-full mt-1" /><div className="text-center text-sm font-bold">{editPct}%</div></div>
                <div><label className="text-xs text-gray-500">Status</label><select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full border rounded px-2 py-1 text-sm mt-1"><option value="not_started">Not Started</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option></select></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="isMilestone" checked={editMilestone} onChange={e => setEditMilestone(e.target.checked)} className="rounded" /><label htmlFor="isMilestone" className="text-sm text-gray-600">Mark as Milestone</label></div>
              </div>
              <div className="flex gap-2 mt-4"><button onClick={saveEdit} className="flex-1 bg-purple-600 text-white py-2 rounded text-sm font-medium hover:bg-purple-700">Save</button><button onClick={() => setEditId(null)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded text-sm hover:bg-gray-200">Cancel</button></div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}