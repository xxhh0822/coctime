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
import type { AnalysisResult, UpgradeTask, Village } from './types'

type Filter = 'all' | Village

const jsonText = ref('')
const analysis = ref<AnalysisResult | null>(null)
const error = ref('')
const filter = ref<Filter>('all')
const nowMs = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

const filteredTasks = computed(() => {
  if (!analysis.value) return []
  if (filter.value === 'all') return analysis.value.tasks
  return analysis.value.tasks.filter((task) => task.village === filter.value)
})

const homeCount = computed(() => analysis.value?.tasks.filter((task) => task.village === 'home').length ?? 0)
const builderCount = computed(() => analysis.value?.tasks.filter((task) => task.village === 'builder').length ?? 0)
const helperTaskCount = computed(() => analysis.value?.tasks.filter((task) => task.recurrent).length ?? 0)
const nextTask = computed(() => analysis.value?.tasks.find((task) => task.adjustedFinishAtMs > nowMs.value) ?? null)

onMounted(() => {
  timer = setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

function runAnalysis() {
  try {
    analysis.value = parseSnapshot(jsonText.value)
    error.value = ''
    filter.value = 'all'
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
  filter.value = 'all'
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
        <a href="#analyzer"><List :size="17" weight="Outline" />升级追踪</a>
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
      <section class="hero-section">
        <div>
          <p class="eyebrow">CLASH OF CLANS · UPGRADE TRACKER</p>
          <h1>升级进度，一眼看清</h1>
          <p class="hero-copy">粘贴玩家 JSON，自动识别升级项目并计算助手加成后的完成时间。</p>
        </div>
        <div v-if="analysis" class="snapshot-meta">
          <strong>{{ analysis.tag }}</strong>
          <span>报文时间 {{ formatDateTime(analysis.snapshotAtMs) }}</span>
        </div>
      </section>

      <section class="summary-grid" aria-label="升级摘要">
        <article class="summary-card">
          <span class="summary-icon gold"><Building :size="25" weight="Outline" /></span>
          <span><small>正在升级</small><strong>{{ analysis?.tasks.length ?? '—' }}</strong><em v-if="analysis">{{ homeCount }} 主村 · {{ builderCount }} 夜世界</em></span>
        </article>
        <article class="summary-card">
          <span class="summary-icon green"><Sparkles :size="25" weight="Outline" /></span>
          <span><small>持续助手任务</small><strong>{{ analysis ? helperTaskCount : '—' }}</strong><em>{{ analysis ? '已按报文状态计算' : '等待解析报文' }}</em></span>
        </article>
        <article class="summary-card">
          <span class="summary-icon gold"><Clock :size="25" weight="Outline" /></span>
          <span><small>最近完成</small><strong class="summary-time">{{ nextTask ? formatDuration(remainingSeconds(nextTask)) : '—' }}</strong><em>{{ nextTask ? nextTask.name : '暂无升级任务' }}</em></span>
        </article>
      </section>

      <section id="analyzer" class="workspace-grid">
        <article class="input-panel">
          <div class="panel-title">
            <span><FileText :size="20" weight="Outline" />粘贴游戏报文</span>
            <small>JSON</small>
          </div>
          <textarea v-model="jsonText" spellcheck="false" aria-label="游戏 JSON 报文" placeholder="在这里粘贴完整的玩家 JSON 报文…" @keydown.ctrl.enter.prevent="runAnalysis" />
          <p v-if="error" class="error-message" role="alert">{{ error }}</p>
          <div class="input-actions">
            <button class="primary-button" type="button" @click="runAnalysis"><Play :size="18" weight="Filled" />开始解析</button>
            <button class="secondary-button" type="button" @click="loadExample">示例</button>
            <button class="icon-button" type="button" aria-label="清空输入" title="清空输入" @click="clearInput"><Trash :size="19" weight="Outline" /></button>
          </div>
          <p class="privacy-note"><ShieldCheck :size="17" weight="Outline" />报文仅在当前浏览器中解析，不会上传或保存。</p>
        </article>

        <article class="results-panel" aria-live="polite">
          <div class="results-toolbar">
            <div class="panel-title compact"><span><List :size="20" weight="Outline" />升级项目 <b v-if="analysis">({{ analysis.tasks.length }})</b></span></div>
            <div v-if="analysis" class="filter-tabs" aria-label="村庄筛选">
              <button type="button" :class="{ active: filter === 'all' }" @click="filter = 'all'">全部 {{ analysis.tasks.length }}</button>
              <button type="button" :class="{ active: filter === 'home' }" @click="filter = 'home'">主村 {{ homeCount }}</button>
              <button type="button" :class="{ active: filter === 'builder' }" @click="filter = 'builder'">夜世界 {{ builderCount }}</button>
            </div>
          </div>

          <div v-if="analysis?.warnings.length" class="warning-list">
            <p v-for="warning in analysis.warnings" :key="warning">{{ warning }}</p>
          </div>

          <div v-if="!analysis" class="empty-state">
            <span><Code :size="30" weight="Outline" /></span>
            <strong>等待解析报文</strong>
            <p>粘贴 JSON 后，这里会按完成时间展示正在升级的项目。</p>
          </div>
          <div v-else-if="analysis.tasks.length === 0" class="empty-state">
            <span><ShieldCheck :size="30" weight="Outline" /></span>
            <strong>没有正在升级的项目</strong>
            <p>报文中未发现包含有效 timer 的升级记录。</p>
          </div>
          <div v-else-if="filteredTasks.length === 0" class="empty-state small">
            <strong>该村庄没有升级任务</strong>
          </div>
          <div v-else class="task-list">
            <article v-for="task in filteredTasks" :key="task.key" class="task-card" :class="{ assisted: task.helperStatus === 'applied', completed: remainingSeconds(task) <= 0 }">
              <span class="task-icon"><component :is="taskIcon(task)" :size="23" weight="Outline" /></span>
              <div class="task-main">
                <strong>{{ task.name }}</strong>
                <small>{{ task.village === 'home' ? '主村' : '夜世界' }} · {{ task.categoryLabel }} · ID {{ task.dataId }}</small>
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
        </article>
      </section>

      <section id="notes" class="notes-section">
        <CircleInfo :size="20" weight="Outline" />
        <p><strong>计算说明：</strong>助手每次最多工作1小时，按23小时工作日重复。结果基于报文快照推算，不包含快照之后使用的药水、书籍、宝石或手动调整。</p>
      </section>
    </main>

    <footer class="site-footer">
      <span>纯前端本地运行，不会将你输入的内容上传或保存到服务器</span>
      <span>非官方玩家工具，与 Supercell 无关联，未获其认可或赞助</span>
    </footer>
  </div>
</template>
