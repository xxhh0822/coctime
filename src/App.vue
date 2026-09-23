<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Building,
  Castle,
  CircleInfo,
  Clock,
  Code,
  FileText,
  Flask,
  Paw,
  Play,
  Sparkles,
  Trash,
} from 'reicon-vue'
import { formatDuration, parseSnapshot } from './analyzer'
import EntityGlyph from './components/EntityGlyph.vue'
import type { AnalysisResult, HelperKind, UpgradeTask, WorkerPool } from './types'

const jsonText = ref('')
const analysis = ref<AnalysisResult | null>(null)
const error = ref('')
const importOpen = ref(false)
const helpersOpen = ref(false)
const nowMs = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

const helperTasks = computed(() => analysis.value?.tasks.filter((task) => task.recurrent) ?? [])
const helperKinds: HelperKind[] = ['builder', 'lab']
const homeBuilderTasks = computed(() => analysis.value?.tasks.filter((task) => ['buildings', 'traps', 'heroes'].includes(task.category)) ?? [])
const builderBaseTasks = computed(() => analysis.value?.tasks.filter((task) => ['buildings2', 'traps2', 'heroes2'].includes(task.category)) ?? [])
const laboratoryTasks = computed(() => analysis.value?.tasks.filter((task) => ['units', 'spells', 'siege_machines'].includes(task.category)) ?? [])
const petTasks = computed(() => analysis.value?.tasks.filter((task) => task.category === 'pets') ?? [])
const starLaboratoryTasks = computed(() => analysis.value?.tasks.filter((task) => task.category === 'units2') ?? [])

onMounted(() => {
  timer = setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

function openImport() {
  error.value = ''
  importOpen.value = true
}

function runAnalysis() {
  try {
    analysis.value = parseSnapshot(jsonText.value)
    error.value = ''
    importOpen.value = false
    nowMs.value = Date.now()
  } catch (reason) {
    analysis.value = null
    error.value = reason instanceof Error ? reason.message : '报文解析失败。'
  }
}

function loadExample() {
  const timestamp = Math.floor(Date.now() / 1000)
  jsonText.value = JSON.stringify({
    tag: '#DEMO',
    timestamp,
    helpers: [
      { data: 124000000, lvl: 4, helper_cooldown: 5919 },
      { data: 124000001, lvl: 12, helper_cooldown: 5919 },
    ],
    buildings: [{ data: 1000015, lvl: 8, cnt: 5 }, { data: 1000064, lvl: 1, cnt: 1 }],
    traps: [
      { data: 12000000, lvl: 13, timer: 499350 },
      { data: 12000000, lvl: 13, timer: 4984, helper_recurrent: true },
      { data: 12000000, lvl: 13, timer: 538296 },
      { data: 12000000, lvl: 13, timer: 357248 },
      { data: 12000000, lvl: 13, timer: 357727 },
      { data: 12000005, lvl: 12, timer: 749757 },
    ],
    units: [{ data: 4000006, lvl: 13, timer: 492324, helper_recurrent: true }],
    pets: [{ data: 73000008, lvl: 13, timer: 500126 }],
    buildings2: [
      { data: 1000041, lvl: 9, timer: 63164 },
      { data: 1000043, lvl: 9, timer: 165956 },
    ],
  }, null, 2)
  runAnalysis()
}

function clearInput() {
  jsonText.value = ''
  analysis.value = null
  error.value = ''
}

function remainingSeconds(task: UpgradeTask) {
  return Math.max(0, (task.adjustedFinishAtMs - nowMs.value) / 1000)
}

function workerSlots(pool: WorkerPool | undefined) {
  if (!pool?.total) return []
  return Array.from({ length: pool.total }, (_, index) => index < pool.busy)
}

function workerSource(pool: WorkerPool | undefined) {
  if (pool?.source === 'hut-count') return '按 Builder’s Hut 与 B.O.B’s Hut 数量计算'
  if (pool?.source === 'builder-base-inference') return '按基础 2 位工人及第六位主世界工人解锁推算'
  return '报文未提供足够的工人数量信息'
}

function helperMessage(task: UpgradeTask) {
  if (task.helperStatus === 'applied') {
    return `${task.helperLevel}级${task.helperName} · 预计节省${formatDuration(task.savedSeconds)}`
  }
  if (task.helperStatus === 'no-saving') return `${task.helperName}冷却结束前项目已完成`
  if (task.helperStatus === 'missing') return `缺少${task.helperName}数据，未计算加成`
  if (task.helperStatus === 'conflict') return `${task.helperName}绑定冲突，未计算加成`
  if (task.village === 'builder') return '建筑大师基地任务'
  if (task.category === 'pets') return '宠物不适用助手加成'
  return '未设置持续助手'
}

function helperTitle(kind: HelperKind) {
  return kind === 'builder' ? '建筑工人学徒' : '实验室助手'
}

function assignedTasks(kind: HelperKind) {
  return helperTasks.value.filter((task) => task.helperKind === kind)
}

function helperCooldown(kind: HelperKind) {
  const helper = analysis.value?.helpers[kind]
  if (!analysis.value || !helper) return '未读取到助手冷却数据'
  const remaining = (analysis.value.snapshotAtMs + helper.cooldownSeconds * 1000 - nowMs.value) / 1000
  return remaining > 0 ? `冷却时间：${formatDuration(remaining)}` : '冷却时间：当前可用'
}

</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="#top" aria-label="COCTIME 首页">
        <span class="brand-mark"><Clock :size="25" weight="Outline" /></span>
        <span><strong>COCTIME</strong><small>升级时间解析</small></span>
      </a>
      <div class="header-actions">
        <button v-if="analysis" class="helper-button" type="button" @click="helpersOpen = true">
          <Sparkles :size="18" weight="Outline" />升级助手 <b>{{ helperTasks.length }}</b>
        </button>
        <button class="import-button" type="button" @click="openImport">
          <FileText :size="18" weight="Outline" />{{ analysis ? '重新导入' : '导入报文' }}
        </button>
        <a class="github-link" href="https://github.com/xxhh0822/coctime" target="_blank" rel="noopener noreferrer" aria-label="打开 GitHub 仓库" title="GitHub 仓库">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 4.8c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
        </a>
      </div>
    </header>

    <main id="top" class="main-content">
      <div v-if="analysis?.warnings.length" class="warning-list">
        <p v-for="warning in analysis.warnings" :key="warning">{{ warning }}</p>
      </div>

      <section v-if="!analysis" class="welcome-state">
        <span><Code :size="30" weight="Outline" /></span>
        <strong>还没有升级数据</strong>
        <p>导入玩家 JSON，解析会在当前浏览器本地完成。</p>
        <button class="primary-button" type="button" @click="openImport"><FileText :size="18" weight="Outline" />导入报文</button>
      </section>

      <template v-else>
        <section class="status-groups" aria-label="工人与独立升级队列概览">
          <section class="status-group" aria-labelledby="worker-group-title">
            <h2 id="worker-group-title">建筑工人</h2>
            <div class="worker-overview-grid">
            <article class="overview-card worker-overview">
              <div class="overview-title"><span><Building :size="23" weight="Outline" /></span><strong>主世界 {{ analysis.workerPools.home.total ?? '—' }} 位工人</strong></div>
              <div class="worker-numbers"><b>{{ analysis.workerPools.home.idle ?? '—' }} <small>空闲</small></b><i></i><b>{{ analysis.workerPools.home.busy }} <small>忙碌</small></b></div>
              <div class="worker-slots" aria-label="主世界工人占用状态"><span v-for="(busy, index) in workerSlots(analysis.workerPools.home)" :key="index" :class="{ busy }">工</span></div>
              <small class="pool-source">{{ workerSource(analysis.workerPools.home) }}</small>
            </article>

            <article class="overview-card worker-overview builder-worker-overview">
              <div class="overview-title"><span><Castle :size="23" weight="Outline" /></span><strong>夜世界工人</strong></div>
              <div class="worker-numbers"><b>{{ analysis.workerPools.builder.idle ?? '—' }} <small>空闲</small></b><i></i><b>{{ analysis.workerPools.builder.busy }} <small>忙碌</small></b></div>
              <div class="worker-slots" aria-label="夜世界工人占用状态"><span v-for="(busy, index) in workerSlots(analysis.workerPools.builder)" :key="index" :class="{ busy }">工</span></div>
              <small class="pool-source">{{ workerSource(analysis.workerPools.builder) }}</small>
            </article>
            </div>
          </section>

          <section class="status-group" aria-labelledby="queue-group-title">
            <h2 id="queue-group-title">独立升级队列</h2>
            <div class="queue-overview-grid">
            <article class="overview-card queue-overview">
              <div class="overview-title"><span><Flask :size="23" weight="Outline" /></span><strong>实验室</strong></div>
              <template v-if="laboratoryTasks[0]">
                <div class="queue-current"><EntityGlyph :task="laboratoryTasks[0]" /><div><strong>{{ laboratoryTasks[0].name }}</strong><b>{{ laboratoryTasks[0].level }} → {{ laboratoryTasks[0].targetLevel }}</b></div></div>
                <small class="queue-remaining">剩余 {{ formatDuration(remainingSeconds(laboratoryTasks[0])) }}</small>
                <em v-if="laboratoryTasks[0].helperStatus === 'applied'" class="queue-helper"><Sparkles :size="12" weight="Outline" />{{ helperMessage(laboratoryTasks[0]) }}</em>
              </template>
              <p v-else class="queue-idle">当前空闲</p>
            </article>

            <article class="overview-card queue-overview">
              <div class="overview-title"><span><Paw :size="23" weight="Outline" /></span><strong>宠物屋</strong></div>
              <template v-if="petTasks[0]">
                <div class="queue-current"><EntityGlyph :task="petTasks[0]" /><div><strong>{{ petTasks[0].name }}</strong><b>{{ petTasks[0].level }} → {{ petTasks[0].targetLevel }}</b></div></div>
                <small class="queue-remaining">剩余 {{ formatDuration(remainingSeconds(petTasks[0])) }}</small>
              </template>
              <p v-else class="queue-idle">当前空闲</p>
            </article>

            <article class="overview-card queue-overview">
              <div class="overview-title"><span><Flask :size="23" weight="Outline" /></span><strong>星空实验室</strong></div>
              <template v-if="starLaboratoryTasks[0]">
                <div class="queue-current"><EntityGlyph :task="starLaboratoryTasks[0]" /><div><strong>{{ starLaboratoryTasks[0].name }}</strong><b>{{ starLaboratoryTasks[0].level }} → {{ starLaboratoryTasks[0].targetLevel }}</b></div></div>
                <small class="queue-remaining">剩余 {{ formatDuration(remainingSeconds(starLaboratoryTasks[0])) }}</small>
              </template>
              <p v-else class="queue-idle">当前空闲</p>
            </article>
            </div>
          </section>
        </section>

        <div class="dashboard-grid">
          <section id="main-world" class="dashboard-panel">
            <header class="panel-header"><div><span><Building :size="21" weight="Outline" /></span><h2>主世界 · 建筑工人任务</h2><b>{{ homeBuilderTasks.length }}</b></div><small>按预计完成时间排序</small></header>
            <div v-if="homeBuilderTasks.length" class="worker-task-grid">
              <article v-for="(task, index) in homeBuilderTasks" :key="task.key" class="worker-task" :class="{ assisted: task.helperStatus === 'applied', completed: remainingSeconds(task) <= 0 }">
                <EntityGlyph :task="task" />
                <div class="worker-task-main"><strong>{{ task.name }}</strong><small>{{ task.categoryLabel }} · ID {{ task.dataId }}</small><b>{{ task.level }} → {{ task.targetLevel }}</b></div>
                <span class="worker-tag">工人 #{{ index + 1 }}</span>
                <small class="task-remaining">剩余 {{ formatDuration(remainingSeconds(task)) }}</small>
                <em v-if="task.helperStatus === 'applied'"><Sparkles :size="13" weight="Outline" />{{ helperMessage(task) }}</em>
              </article>
            </div>
            <div v-else class="empty-world">当前没有建筑工人任务</div>
          </section>

          <aside class="builder-dashboard">
            <section id="builder-world" class="dashboard-panel builder-panel">
              <header class="panel-header"><div><span><Castle :size="21" weight="Outline" /></span><h2>夜世界 · 建筑工人任务</h2><b>{{ builderBaseTasks.length }}</b></div><small>按预计完成时间排序</small></header>
              <div v-if="builderBaseTasks.length" class="builder-task-grid">
                <article v-for="(task, index) in builderBaseTasks" :key="task.key" class="worker-task"><EntityGlyph :task="task" /><div class="worker-task-main"><strong>{{ task.name }}</strong><small>{{ task.categoryLabel }} · ID {{ task.dataId }}</small><b>{{ task.level }} → {{ task.targetLevel }}</b></div><span class="worker-tag">工人 #{{ index + 1 }}</span><small class="task-remaining">剩余 {{ formatDuration(remainingSeconds(task)) }}</small></article>
              </div>
              <div v-else class="empty-world">当前没有夜世界建筑工人任务</div>
            </section>
          </aside>
        </div>
      </template>

      <section id="notes" class="notes-section">
        <CircleInfo :size="20" weight="Outline" />
        <p><strong>计算说明：</strong>助手每次最多工作1小时，按23小时工作日重复。结果基于报文快照推算，不包含快照之后使用的药水、书籍、宝石或手动调整。</p>
      </section>
    </main>

    <footer class="site-footer">
      <span>纯前端本地运行，不会将你输入的内容上传或保存到服务器</span>
      <span>非官方玩家工具，与 Supercell 无关联，未获其认可或赞助</span>
    </footer>

    <div v-if="importOpen" class="modal-backdrop" role="presentation" @mousedown.self="importOpen = false">
      <section class="modal-card import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <header class="modal-header">
          <div><h2 id="import-title">导入游戏报文</h2><p>内容只在当前浏览器中解析，不会上传或保存。</p></div>
          <button class="modal-close" type="button" aria-label="关闭导入窗口" @click="importOpen = false">×</button>
        </header>
        <textarea v-model="jsonText" spellcheck="false" aria-label="游戏 JSON 报文" placeholder="在这里粘贴完整的玩家 JSON 报文…" @keydown.ctrl.enter.prevent="runAnalysis" />
        <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        <div class="modal-actions">
          <button class="text-button" type="button" @click="loadExample">载入示例</button>
          <button class="icon-button" type="button" aria-label="清空输入" title="清空输入" @click="clearInput"><Trash :size="19" weight="Outline" /></button>
          <button class="primary-button" type="button" @click="runAnalysis"><Play :size="18" weight="Filled" />开始解析</button>
        </div>
      </section>
    </div>

    <div v-if="helpersOpen" class="modal-backdrop" role="presentation" @mousedown.self="helpersOpen = false">
      <section class="modal-card helper-modal" role="dialog" aria-modal="true" aria-labelledby="helper-title">
        <header class="modal-header">
          <div><h2 id="helper-title">升级助手使用情况</h2><p>报文中标记为持续使用助手的升级项目</p></div>
          <button class="modal-close" type="button" aria-label="关闭助手详情" @click="helpersOpen = false">×</button>
        </header>
        <div class="helper-list">
          <article v-for="kind in helperKinds" :key="kind" class="helper-detail">
            <div class="helper-name"><span><Sparkles :size="20" weight="Outline" /></span><div><strong>{{ helperTitle(kind) }}</strong><small class="helper-cooldown">{{ helperCooldown(kind) }}</small></div></div>
            <div v-if="assignedTasks(kind).length" class="helper-assignments">
              <div v-for="task in assignedTasks(kind)" :key="task.key" class="helper-assignment">
                <div class="helper-task-content">
                  <EntityGlyph :task="task" size="small" />
                  <div><strong>{{ task.name }}</strong><small>{{ task.categoryLabel }} · {{ task.level }} → {{ task.targetLevel }}</small></div>
                </div>
                <span>{{ helperMessage(task) }}</span>
              </div>
            </div>
            <p v-else>当前未绑定升级项目</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
