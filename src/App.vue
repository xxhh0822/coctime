<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import {
  Bomb,
  Building,
  Castle,
  CircleInfo,
  Clock,
  Code,
  FileText,
  Flask,
  House,
  List,
  MagicWand,
  Paw,
  Play,
  ShieldCheck,
  Sparkles,
  Trash,
} from 'reicon-vue'
import { formatDateTime, formatDuration, parseSnapshot } from './analyzer'
import type { AnalysisResult, HelperKind, UpgradeTask } from './types'

const jsonText = ref('')
const analysis = ref<AnalysisResult | null>(null)
const error = ref('')
const importOpen = ref(false)
const helpersOpen = ref(false)
const nowMs = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

const homeTasks = computed(() => analysis.value?.tasks.filter((task) => task.village === 'home') ?? [])
const builderTasks = computed(() => analysis.value?.tasks.filter((task) => task.village === 'builder') ?? [])
const helperTasks = computed(() => analysis.value?.tasks.filter((task) => task.recurrent) ?? [])
const helperKinds: HelperKind[] = ['builder', 'lab']
const worlds = computed(() => [
  { key: 'home', title: '主世界', description: '建筑、英雄、兵种、法术、攻城机器与宠物', icon: House, tasks: homeTasks.value },
  { key: 'builder', title: '夜世界', description: '建筑大师基地升级项目', icon: Castle, tasks: builderTasks.value },
])

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
      { data: 1000041, lvl: 9, timer: 416594 },
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

function finishLabel(task: UpgradeTask) {
  if (remainingSeconds(task) <= 0) return '按报文推算已完成'
  return `预计 ${new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(task.adjustedFinishAtMs))} 完成`
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

function taskIcon(task: UpgradeTask): Component {
  if (task.category.includes('traps')) return Bomb
  if (task.category.includes('units') || task.category === 'siege_machines') return Flask
  if (task.category === 'spells') return MagicWand
  if (task.category === 'pets') return Paw
  if (task.category.includes('heroes')) return Sparkles
  if (task.village === 'builder') return Castle
  return Building
}
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="#top" aria-label="COCTIME 首页">
        <span class="brand-mark"><Clock :size="25" weight="Outline" /></span>
        <span><strong>COCTIME</strong><small>升级时间解析</small></span>
      </a>
      <nav class="main-nav" aria-label="页面导航">
        <a href="#top"><House :size="17" weight="Outline" />首页</a>
        <a href="#main-world"><List :size="17" weight="Outline" />升级追踪</a>
        <a href="#notes"><CircleInfo :size="17" weight="Outline" />使用说明</a>
      </nav>
      <div class="header-actions">
        <span class="local-badge"><ShieldCheck :size="18" weight="Outline" />纯本地运行</span>
        <a class="github-link" href="https://github.com/xxhh0822/coctime" target="_blank" rel="noopener noreferrer" aria-label="打开 GitHub 仓库" title="GitHub 仓库">
          <Code :size="19" weight="Outline" />
        </a>
      </div>
    </header>

    <main id="top" class="main-content">
      <section id="analyzer" class="content-toolbar" aria-label="报文和助手操作">
        <div class="player-meta">
          <template v-if="analysis">
            <strong>{{ analysis.tag }}</strong>
            <span>报文时间 {{ formatDateTime(analysis.snapshotAtMs) }}</span>
          </template>
          <template v-else>
            <strong>升级进度</strong>
            <span>导入游戏报文后查看正在升级的项目</span>
          </template>
        </div>
        <div class="toolbar-actions">
          <button v-if="analysis" class="helper-button" type="button" @click="helpersOpen = true">
            <Sparkles :size="18" weight="Outline" />升级助手 <b>{{ helperTasks.length }}</b>
          </button>
          <button class="import-button" type="button" @click="openImport">
            <FileText :size="18" weight="Outline" />{{ analysis ? '重新导入' : '导入报文' }}
          </button>
        </div>
      </section>

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
        <section
          v-for="world in worlds"
          :id="world.key === 'home' ? 'main-world' : 'builder-world'"
          :key="world.key"
          class="world-section"
        >
          <header class="world-header">
            <div class="world-title">
              <span><component :is="world.icon" :size="22" weight="Outline" /></span>
              <div><h2>{{ world.title }}</h2><p>{{ world.description }}</p></div>
            </div>
            <strong class="world-count">{{ world.tasks.length }} 项升级</strong>
          </header>

          <div v-if="world.tasks.length === 0" class="empty-world">当前没有正在升级的项目</div>
          <div v-else class="task-list">
            <article v-for="task in world.tasks" :key="task.key" class="task-card" :class="{ assisted: task.helperStatus === 'applied', completed: remainingSeconds(task) <= 0 }">
              <span class="task-icon"><component :is="taskIcon(task)" :size="23" weight="Outline" /></span>
              <div class="task-main">
                <strong>{{ task.name }}</strong>
                <small>{{ task.categoryLabel }} · ID {{ task.dataId }}</small>
              </div>
              <div class="task-level">
                <template v-if="task.level !== null"><strong>{{ task.level }}</strong><span>→</span><strong>{{ task.targetLevel }}</strong></template>
                <span v-else>等级未知</span>
                <em :class="task.helperStatus"><Sparkles v-if="task.helperStatus === 'applied'" :size="14" weight="Outline" />{{ helperMessage(task) }}</em>
              </div>
              <div class="task-time">
                <strong>{{ formatDuration(remainingSeconds(task)) }}</strong>
                <small>{{ finishLabel(task) }}</small>
              </div>
            </article>
          </div>
        </section>
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
            <div class="helper-name"><span><Sparkles :size="20" weight="Outline" /></span><strong>{{ helperTitle(kind) }}</strong></div>
            <div v-if="assignedTasks(kind).length" class="helper-assignments">
              <div v-for="task in assignedTasks(kind)" :key="task.key" class="helper-assignment">
                <div><strong>{{ task.name }}</strong><small>{{ task.categoryLabel }} · {{ task.level }} → {{ task.targetLevel }}</small></div>
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
