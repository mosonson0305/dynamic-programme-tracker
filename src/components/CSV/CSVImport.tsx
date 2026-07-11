import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Upload, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { useProgrammeStore } from '../../store/programmeStore'
import { todayStr } from '../../utils/date-utils'

export default function CSVImport() {
  const importCSV = useProgrammeStore((s) => s.importCSV)
  const error = useProgrammeStore((s) => s.error)
  const warnings = useProgrammeStore((s) => s.warnings)
  const isLoading = useProgrammeStore((s) => s.isLoading)

  const [projectName, setProjectName] = useState('')
  const [dataDate, setDataDate] = useState(todayStr())
  const [csvText, setCsvText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = useCallback(async () => {
    setLocalError(null)
    setSuccess(false)

    if (!projectName.trim()) {
      setLocalError('Please enter a project name')
      return
    }
    if (!csvText.trim()) {
      setLocalError('Please provide CSV data')
      return
    }

    await importCSV(csvText, projectName.trim(), dataDate)
    setSuccess(true)
  }, [projectName, dataDate, csvText, importCSV])

  const handleFileDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)

      const file = e.dataTransfer.files[0]
      if (!file) return

      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        setLocalError('Please drop a .csv or .txt file')
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        setCsvText(ev.target?.result as string)
      }
      reader.readAsText(file)
    },
    [],
  )

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string)
    }
    reader.readAsText(file)
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Import Programme CSV</h2>

      {/* Project name + data date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. City Center Phase 2"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Date
          </label>
          <input
            type="date"
            value={dataDate}
            onChange={(e) => setDataDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Drag-and-drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-sm text-gray-600 mb-1">
          Drag and drop a CSV file here
        </p>
        <p className="text-xs text-gray-400 mb-3">or</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-purple-600 hover:text-purple-800 font-medium underline"
        >
          Browse files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Textarea for paste */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Or paste CSV content
        </label>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="WBS,Name,Duration,Start,Finish,Status,Percent Complete..."
          rows={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
        />
      </div>

      {/* Errors */}
      {(localError || error) && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle size={16} />
          {localError || error}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="font-medium mb-1">Warnings:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success */}
      {success && !isLoading && !error && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle size={16} />
          Import successful! Switch to Gantt or Dashboard tab to view.
        </div>
      )}

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={isLoading}
        className="w-full py-3 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Importing...
          </>
        ) : (
          'Import CSV'
        )}
      </button>
    </div>
  )
}
