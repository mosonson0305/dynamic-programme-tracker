export interface BaselineSnapshotActivity {
  id: string
  wbsCode: string
  name: string
  duration: number
  startDate: string
  finishDate: string
  isCritical: boolean
}

export interface Baseline {
  id: string
  projectId: string
  name: string
  type: 'contract' | 'revised' | 'working' | 'imported'
  createdAt: string
  snapshot: {
    activities: BaselineSnapshotActivity[]
  }
}
