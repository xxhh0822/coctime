import idMap from './data/id-map.json'
import type {
  AnalysisResult,
  BoostRecord,
  HelperKind,
  HelperState,
  RawRecord,
  SnapshotPayload,
  UpgradeTask,
  Village,
} from './types'

type MapKey = keyof typeof idMap

interface CategoryConfig {
  source: string
  label: string
  village: Village
  mapKey: MapKey
  helperKind: HelperKind | null
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  { source: 'buildings', label: '建筑', village: 'home', mapKey: 'th_buildings', helperKind: 'builder' },
  { source: 'traps', label: '陷阱', village: 'home', mapKey: 'th_buildings', helperKind: 'builder' },
  { source: 'units', label: '兵种', village: 'home', mapKey: 'th_troops', helperKind: 'lab' },
  { source: 'siege_machines', label: '攻城机器', village: 'home', mapKey: 'th_troops', helperKind: 'lab' },
  { source: 'spells', label: '法术', village: 'home', mapKey: 'th_troops', helperKind: 'lab' },
  { source: 'heroes', label: '英雄', village: 'home', mapKey: 'heroes', helperKind: 'builder' },
  { source: 'pets', label: '宠物', village: 'home', mapKey: 'pets', helperKind: null },
  { source: 'buildings2', label: '夜世界建筑', village: 'builder', mapKey: 'bh_buildings', helperKind: null },
  { source: 'traps2', label: '夜世界陷阱', village: 'builder', mapKey: 'bh_buildings', helperKind: null },
  { source: 'units2', label: '夜世界兵种', village: 'builder', mapKey: 'bh_troops', helperKind: null },
  { source: 'heroes2', label: '夜世界英雄', village: 'builder', mapKey: 'bh_buildings', helperKind: null },
]

const HELPER_IDS: Record<HelperKind, number[]> = {
  builder: [124000000, 93000000],
  lab: [124000001, 93000001],
}

const HELPER_NAMES: Record<HelperKind, string> = {
  builder: '建筑工人学徒',
  lab: '实验室助手',
}

const WORKDAY_SECONDS = 23 * 60 * 60
const SESSION_SECONDS = 60 * 60

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeTimestamp(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error('报文缺少有效的 timestamp，无法计算实时剩余时间。')
  }
  return value >= 1_000_000_000_000 ? Math.trunc(value) : Math.trunc(value * 1000)
}

function getRecords(payload: SnapshotPayload, source: string): RawRecord[] {
  const value = payload[source]
  return Array.isArray(value) ? value.filter(isRecord) as RawRecord[] : []
}

function countPlacedItems(payload: SnapshotPayload, source: string, dataId: number) {
  return getRecords(payload, source)
    .filter((record) => record.data === dataId)
    .reduce((total, record) => total + (typeof record.cnt === 'number' && record.cnt > 0 ? record.cnt : 1), 0)
}

function findHelpers(payload: SnapshotPayload): Partial<Record<HelperKind, HelperState>> {
  const helpers = getRecords(payload, 'helpers')
  const result: Partial<Record<HelperKind, HelperState>> = {}

  for (const kind of Object.keys(HELPER_IDS) as HelperKind[]) {
    const record = helpers.find((item) => typeof item.data === 'number' && HELPER_IDS[kind].includes(item.data))
    if (record && typeof record.lvl === 'number' && record.lvl > 0) {
      result[kind] = {
        kind,
        name: HELPER_NAMES[kind],
        level: record.lvl,
        cooldownSeconds: typeof record.helper_cooldown === 'number' && record.helper_cooldown > 0
          ? record.helper_cooldown
          : 0,
      }
    }
  }

  return result
}

export function calculateAdjustedFinish(
  snapshotAtMs: number,
  timerSeconds: number,
  helper: HelperState,
) {
  let nowMs = snapshotAtMs
  let remaining = timerSeconds
  let nextBoostAtMs = snapshotAtMs + helper.cooldownSeconds * 1000
  const boosts: BoostRecord[] = []

  while (remaining > 0) {
    const waitSeconds = Math.max(0, (nextBoostAtMs - nowMs) / 1000)
    if (remaining <= waitSeconds) {
      nowMs += remaining * 1000
      remaining = 0
      break
    }

    remaining -= waitSeconds
    nowMs = nextBoostAtMs

    const totalRate = helper.level + 1
    const realSecondsNeeded = remaining / totalRate
    const sessionSeconds = Math.min(SESSION_SECONDS, realSecondsNeeded)
    const helperProgressSeconds = sessionSeconds * helper.level
    const endsAtMs = nowMs + sessionSeconds * 1000

    boosts.push({
      startsAtMs: nowMs,
      endsAtMs,
      helperProgressSeconds,
      partial: sessionSeconds < SESSION_SECONDS,
    })

    remaining -= sessionSeconds * totalRate
    nowMs = endsAtMs
    if (remaining <= 0) break

    nextBoostAtMs += WORKDAY_SECONDS * 1000
  }

  const baselineFinishAtMs = snapshotAtMs + timerSeconds * 1000
  return {
    baselineFinishAtMs,
    adjustedFinishAtMs: nowMs,
    savedSeconds: Math.max(0, (baselineFinishAtMs - nowMs) / 1000),
    boosts,
  }
}

export function resolveItemName(mapKey: MapKey, dataId: number) {
  const map = idMap[mapKey] as Record<string, string>
  return map[String(dataId)] ?? `未知项目 · ${dataId}`
}

function parsePayload(jsonText: string): SnapshotPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('JSON 格式不正确，请检查逗号、引号和括号。')
  }

  if (!isRecord(parsed)) {
    throw new Error('报文顶层必须是一个 JSON 对象。')
  }
  return parsed as SnapshotPayload
}

export function parseSnapshot(jsonText: string): AnalysisResult {
  if (!jsonText.trim()) throw new Error('请先粘贴游戏 JSON 报文。')

  const payload = parsePayload(jsonText)
  const snapshotAtMs = normalizeTimestamp(payload.timestamp)
  const helpers = findHelpers(payload)
  const warnings: string[] = []

  const candidates = CATEGORY_CONFIG.flatMap((config) =>
    getRecords(payload, config.source)
      .map((record, index) => ({ config, record, index }))
      .filter(({ record }) => typeof record.timer === 'number' && Number.isFinite(record.timer) && record.timer > 0),
  )

  const recurrentCounts: Record<HelperKind, number> = { builder: 0, lab: 0 }
  for (const { config, record } of candidates) {
    if (config.helperKind && record.helper_recurrent === true) recurrentCounts[config.helperKind] += 1
  }

  for (const kind of Object.keys(recurrentCounts) as HelperKind[]) {
    if (recurrentCounts[kind] > 1) {
      warnings.push(`${HELPER_NAMES[kind]}同时绑定了多个任务，无法可靠计算这些任务的助手加成。`)
    }
  }

  const tasks: UpgradeTask[] = candidates.map(({ config, record, index }) => {
    const dataId = typeof record.data === 'number' ? record.data : -1
    const level = typeof record.lvl === 'number' ? record.lvl : null
    const timerSeconds = record.timer as number
    const recurrent = record.helper_recurrent === true
    const baselineFinishAtMs = snapshotAtMs + timerSeconds * 1000
    let adjustedFinishAtMs = baselineFinishAtMs
    let savedSeconds = 0
    let boosts: BoostRecord[] = []
    let helperStatus: UpgradeTask['helperStatus'] = 'none'
    let helperName: string | null = null
    let helperLevel: number | null = null

    if (recurrent && config.helperKind) {
      helperName = HELPER_NAMES[config.helperKind]
      const helper = helpers[config.helperKind]
      if (recurrentCounts[config.helperKind] > 1) {
        helperStatus = 'conflict'
      } else if (!helper) {
        helperStatus = 'missing'
      } else {
        helperLevel = helper.level
        const calculated = calculateAdjustedFinish(snapshotAtMs, timerSeconds, helper)
        adjustedFinishAtMs = calculated.adjustedFinishAtMs
        savedSeconds = calculated.savedSeconds
        boosts = calculated.boosts
        helperStatus = savedSeconds > 0 ? 'applied' : 'no-saving'
      }
    }

    return {
      key: `${config.source}-${index}-${dataId}`,
      source: config.source,
      category: config.source,
      categoryLabel: config.label,
      village: config.village,
      dataId,
      name: dataId >= 0 ? resolveItemName(config.mapKey, dataId) : '未知项目',
      level,
      targetLevel: level === null ? null : level + 1,
      timerSeconds,
      baselineFinishAtMs,
      adjustedFinishAtMs,
      savedSeconds,
      boosts,
      recurrent,
      helperKind: config.helperKind,
      helperName,
      helperLevel,
      helperStatus,
    }
  })

  tasks.sort((a, b) => a.adjustedFinishAtMs - b.adjustedFinishAtMs)

  const homeBuilderTasks = tasks.filter((task) => task.category === 'buildings' || task.category === 'traps' || task.category === 'heroes')
  const builderBaseTasks = tasks.filter((task) => task.category === 'buildings2' || task.category === 'traps2' || task.category === 'heroes2')
  const homeBuilderHuts = countPlacedItems(payload, 'buildings', 1000015)
  const bobHuts = countPlacedItems(payload, 'buildings', 1000064)
  const homeBuilderTotal = homeBuilderHuts + bobHuts
  const hasHomeWorkerData = homeBuilderTotal > 0
  const builderBaseTotal = hasHomeWorkerData ? (homeBuilderTotal >= 6 ? 3 : 2) : null

  return {
    tag: typeof payload.tag === 'string' && payload.tag.trim() ? payload.tag : '未提供玩家标签',
    snapshotAtMs,
    tasks,
    workerPools: {
      home: {
        total: hasHomeWorkerData ? homeBuilderTotal : null,
        busy: homeBuilderTasks.length,
        idle: hasHomeWorkerData ? Math.max(0, homeBuilderTotal - homeBuilderTasks.length) : null,
        source: hasHomeWorkerData ? 'hut-count' : 'unavailable',
      },
      builder: {
        total: builderBaseTotal,
        busy: builderBaseTasks.length,
        idle: builderBaseTotal === null ? null : Math.max(0, builderBaseTotal - builderBaseTasks.length),
        source: builderBaseTotal === null ? 'unavailable' : 'builder-base-inference',
      },
    },
    warnings,
  }
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  if (seconds === 0) return '已完成'
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  const rest = seconds % 60
  if (days > 0) return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function formatDateTime(valueMs: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(valueMs))
}
