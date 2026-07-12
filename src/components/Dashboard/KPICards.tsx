import { useMemo } from 'react'
import { useProgrammeStore } from '../../store/programmeStore'
import { todayStr } from '../../utils/date-utils'

type ColorClass = 'text-green-600' | 'text-yellow-500' | 'text-red-500'

function percentColor(pct: number): ColorClass {
  if (pct >= 80) return 'text-green-600'
  if (pct >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

function spiColor(spi: number): ColorClass {
  if (spi >= 0.95) return 'text-green-600'
  if (spi >= 0.8) return 'text-yellow-500'
  return 'text-red-500'
}

function slipColor(days: number): ColorClass {
  if (days <= 0) return 'text-green-600'
  if (days <= 14) return 'text-yellow-500'
  return 'text-red-500'
}

export default function KPICards() {
  const activities = useProgrammeStore((s) => s.activities)
  const baselines = useProgrammeStore((s) => s.baselines)
  const scheduleResult = useProgrammeStore((s) => s.scheduleResult)

  const kpis = useMemo(() => {
    // --- Overall % Complete (weighted by duration) ---
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0)
    const weightedComplete =
      totalDuration > 0
        ? Math.round(
            activities.reduce((sum, a) => sum + (a.percentComplete / 100) * a.duration, 0) /
              (totalDuration / 100),
          )
        : 0

    // --- SPI (EV / PV) ---
    let spi: number | null = null
    if (baselines.length > 0) {
      const baselineActivities = baselines[0].snapshot.activities
      const baselineMap = new Map(baselineActivities.map((b) => [b.id, b]))
      const today = todayStr()

      const ev = activities.reduce(
        (sum, a) => sum + (a.percentComplete / 100) * a.duration,
        0,
      )
      const pv = activities.reduce((sum, a) => {
        const bl = baselineMap.get(a.id)
        if (bl && bl.finishDate <= today) {
          return sum + a.duration
        }
        return sum
      }, 0)

      spi = pv > 0 ? ev / pv : null
    }

    // --- CP Slip: projectFinish vs baseline max finish ---
    let cpSlip: number | null = null
    if (baselines.length > 0 && scheduleResult) {
      const blFinishes = baselines[0].snapshot.activities
        .map((a) => a.finishDate)
        .filter(Boolean)
      if (blFinishes.length > 0) {
        const baselineMax = blFinishes.sort().reverse()[0] // max date lexicographically
        const projectFinish = scheduleResult.projectFinish
        const msDiff =
          new Date(projectFinish + 'T00:00:00').getTime() -
          new Date(baselineMax + 'T00:00:00').getTime()
        cpSlip = Math.round(msDiff / 86400000)
      }
    }

    // --- Delay: sum of (actualFinish - planned finish) for completed activities
    let totalDelay = 0
    for (const a of activities) {
      if (a.actualFinish && a.finishDate && a.actualFinish > a.finishDate) {
        const actual = new Date(a.actualFinish + 'T00:00:00Z').getTime()
        const planned = new Date(a.finishDate + 'T00:00:00Z').getTime()
        totalDelay += Math.round((actual - planned) / 86400000)
      }
    }

    // --- Milestones ---
    const milestones = activities.filter((a) => a.isMilestone)
    const milestoneCompleted = milestones.filter((a) => a.status === 'completed').length
    const milestoneTotal = milestones.length
    const milestonePct =
      milestoneTotal > 0 ? Math.round((milestoneCompleted / milestoneTotal) * 100) : 0

    // --- Milestones due ---
    const today = todayStr()
    const milestoneDue = milestones.filter((a) => {
      if (a.status === 'completed') return false
      // Due if finish date <= today, or delayed
      return a.finishDate && a.finishDate <= today
    }).length

    return {
      percentComplete: weightedComplete,
      spi,
      cpSlip,
      milestoneCompleted,
      milestoneTotal,
      milestonePct,
      totalDelay,
      milestoneDue,
    }
  }, [activities, baselines, scheduleResult])

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Overall % Complete */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">Overall % Complete</div>
        <div className={`text-3xl font-bold ${percentColor(kpis.percentComplete)}`}>
          {kpis.percentComplete}%
        </div>
        <div className="text-xs text-gray-400 mt-1">Weighted by duration</div>
      </div>

      {/* SPI */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">SPI</div>
        {kpis.spi !== null ? (
          <>
            <div className={`text-3xl font-bold ${spiColor(kpis.spi)}`}>
              {kpis.spi.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">EV / PV</div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-gray-400">--</div>
            <div className="text-xs text-yellow-500 mt-1">Need baseline</div>
          </>
        )}
      </div>

      {/* CP Slip */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">CP Slip</div>
        {kpis.cpSlip !== null ? (
          <>
            <div className={`text-3xl font-bold ${slipColor(kpis.cpSlip)}`}>
              {kpis.cpSlip >= 0 ? '+' : ''}
              {kpis.cpSlip}d
            </div>
            <div className="text-xs text-gray-400 mt-1">vs baseline finish</div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-gray-400">--</div>
            <div className="text-xs text-yellow-500 mt-1">Need baseline</div>
          </>
        )}
      </div>

      {/* Total Delay */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">Total Delay</div>
        <div className={`text-3xl font-bold ${kpis.totalDelay > 0 ? 'text-red-500' : 'text-green-600'}`}>
          {kpis.totalDelay > 0 ? '+' : ''}{kpis.totalDelay}d
        </div>
        <div className="text-xs text-gray-400 mt-1">Actual vs planned</div>
      </div>

      {/* Milestones */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">Milestones</div>
        <div className={`text-3xl font-bold ${percentColor(kpis.milestonePct)}`}>
          {kpis.milestoneCompleted}/{kpis.milestoneTotal}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {kpis.milestonePct}% complete
          {kpis.milestoneDue > 0 && (
            <span className="text-red-500 ml-1">({kpis.milestoneDue} overdue)</span>
          )}
        </div>
      </div>
    </div>
  )
}
