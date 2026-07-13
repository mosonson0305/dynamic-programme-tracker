import KPICards from './KPICards'
import StatusChart from './StatusChart'
import CPList from './CPList'
import UpcomingMilestones from './UpcomingMilestones'
import SCurve from './SCurve'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Project Health Dashboard</h2>

      <KPICards />

      <SCurve />

      <div className="grid grid-cols-2 gap-4">
        <StatusChart />
        <CPList />
      </div>

      <UpcomingMilestones />
    </div>
  )
}
