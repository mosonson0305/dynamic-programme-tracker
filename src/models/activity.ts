export type ConstraintType = 'ASAP' | 'ALAP' | 'SNET' | 'FNET'

export type ActivityStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed'

export interface Activity {
  id: string
  projectId: string
  wbsCode: string
  name: string
  parentId: string | null
  duration: number
  startDate: string | null
  finishDate: string | null
  actualStart: string | null
  actualFinish: string | null
  percentComplete: number
  earlyStart: string | null
  earlyFinish: string | null
  lateStart: string | null
  lateFinish: string | null
  totalFloat: number
  isCritical: boolean
  isMilestone: boolean
  constraintType: ConstraintType
  constraintDate: string | null
  status: ActivityStatus
  wbsLevel: number
  bimRef: string | null
  createdAt: string
  updatedAt: string
}
