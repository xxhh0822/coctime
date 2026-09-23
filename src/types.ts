export type Village = 'home' | 'builder'
export type HelperKind = 'builder' | 'lab'
export type HelperStatus = 'none' | 'applied' | 'no-saving' | 'missing' | 'conflict'

export interface RawRecord {
  data?: number
  lvl?: number
  timer?: number
  helper_recurrent?: boolean
  helper_cooldown?: number
  [key: string]: unknown
}
export interface SnapshotPayload {
  tag?: string
  timestamp?: number
  helpers?: RawRecord[]
  [key: string]: unknown
}

export interface HelperState {
  kind: HelperKind
  name: string
  level: number
  cooldownSeconds: number
}

export interface BoostRecord {
  startsAtMs: number
  endsAtMs: number
  helperProgressSeconds: number
  partial: boolean
}

export interface UpgradeTask {
  key: string
  source: string
  category: string
  categoryLabel: string
  village: Village
  dataId: number
  name: string
  level: number | null
  targetLevel: number | null
  timerSeconds: number
  baselineFinishAtMs: number
  adjustedFinishAtMs: number
  savedSeconds: number
  boosts: BoostRecord[]
  recurrent: boolean
  helperKind: HelperKind | null
  helperName: string | null
  helperLevel: number | null
  helperStatus: HelperStatus
}

export interface WorkerPool {
  total: number | null
  busy: number
  idle: number | null
  source: 'hut-count' | 'builder-base-inference' | 'unavailable'
}

export interface AnalysisResult {
  tag: string
  snapshotAtMs: number
  tasks: UpgradeTask[]
  workerPools: {
    home: WorkerPool
    builder: WorkerPool
  }
  warnings: string[]
}
