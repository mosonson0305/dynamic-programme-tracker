import { LayoutDashboard, BarChart3, FileDown, FileUp, GitBranch } from 'lucide-react'
import { useProgrammeStore } from './store/programmeStore'
import GanttView from './components/Gantt/GanttView'
import WBSTree from './components/WBSTree/WBSTree'
import Dashboard from './components/Dashboard/Dashboard'
import CSVImport from './components/CSV/CSVImport'
import CSVExport from './components/CSV/CSVExport'

const tabs = [
  { id: 'csv' as const, label: 'CSV', icon: FileUp },
  { id: 'gantt' as const, label: 'Gantt', icon: BarChart3 },
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'wbs' as const, label: 'WBS Tree', icon: GitBranch },
  { id: 'export' as const, label: 'Export', icon: FileDown },
]

export default function App() {
  const activeTab = useProgrammeStore((s) => s.activeTab)
  const setActiveTab = useProgrammeStore((s) => s.setActiveTab)
  const project = useProgrammeStore((s) => s.project)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">
            📋 Dynamic Programme Tracker
            {project && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                — {project.name}
              </span>
            )}
          </h1>
        </div>

        {/* Tab navigation */}
        <nav className="max-w-7xl mx-auto px-4 flex gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'csv' && <CSVImport />}
        {activeTab === 'gantt' && <GanttView />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'wbs' && <WBSTree />}
        {activeTab === 'export' && <CSVExport />}
      </main>
    </div>
  )
}
