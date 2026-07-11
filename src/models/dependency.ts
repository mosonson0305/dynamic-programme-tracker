export type RelationType = 'FS' | 'SS' | 'FF' | 'SF'

export interface Dependency {
  id: string
  projectId: string
  predecessorId: string
  successorId: string
  relationType: RelationType
  lagDays: number
}
