<script setup lang="ts">
import { computed } from 'vue'
import { resolveEntityIcon } from '../entity-icons'
import type { UpgradeTask } from '../types'

const props = withDefaults(defineProps<{
  task: Pick<UpgradeTask, 'category' | 'dataId' | 'name'>
  size?: 'default' | 'small'
}>(), {
  size: 'default',
})

const icon = computed(() => resolveEntityIcon(props.task))
const markerX = computed(() => 16 + icon.value.seed % 10)
const markerY = computed(() => 16 + Math.floor(icon.value.seed / 10) % 10)
</script>

<template>
  <span class="entity-glyph" :class="[`entity-glyph--${icon.family}`, `entity-glyph--${size}`]" aria-hidden="true">
    <svg viewBox="0 0 36 36" fill="none">
      <rect x="1" y="1" width="34" height="34" rx="10" class="entity-glyph__surface" />

      <g v-if="icon.variant === 'bomb'" class="entity-glyph__line">
        <circle cx="17" cy="20" r="8" />
        <path d="M21.5 13.5 25 10m0 0h4m-4 0v4" />
      </g>
      <g v-else-if="icon.variant === 'spring'" class="entity-glyph__line"><path d="M9 25h18M10 21h16M12 17h12M14 13h8" /></g>
      <g v-else-if="icon.variant === 'skull'" class="entity-glyph__line"><path d="M11 17a7 7 0 1 1 13 4.5V26h-3v-3h-6v3h-3v-4.5A7 7 0 0 1 11 17Z" /><path d="M15 18h1m4 0h1" /></g>
      <g v-else-if="icon.variant === 'vortex'" class="entity-glyph__line"><path d="M11 12c7-4 15 1 11 6-4 5-14 0-9-5 5-5 15 4 9 11-5 6-15 0-10-7" /></g>
      <g v-else-if="icon.variant === 'cannon'" class="entity-glyph__line"><path d="M9 23h18l-3 5H12l-3-5Z" /><path d="m16 23 2-13h8l-2 13" /></g>
      <g v-else-if="icon.variant === 'tesla'" class="entity-glyph__line"><path d="M11 27h14l-2-15h-10l-2 15Z" /><path d="m19 8-4 8h5l-3 7 6-9h-5l1-6Z" /></g>
      <g v-else-if="icon.variant === 'mortar'" class="entity-glyph__line"><path d="M10 26h16l-2-5H12l-2 5Z" /><path d="M14 21V11h8v10" /></g>
      <g v-else-if="icon.variant === 'tower'" class="entity-glyph__line"><path d="M11 28h14l-2-15H13l-2 15Z" /><path d="M10 13h16M14 18h2m4 0h2" /></g>
      <g v-else-if="icon.variant === 'storage'" class="entity-glyph__line"><path d="M10 14c0-5 16-5 16 0v11c0 5-16 5-16 0V14Z" /><path d="M10 18c0 5 16 5 16 0" /></g>
      <g v-else-if="icon.variant === 'laboratory' || icon.variant === 'spell'" class="entity-glyph__line"><path d="M15 8v8l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V8" /><path d="M13 8h10M13 22h10" /></g>
      <g v-else-if="icon.variant === 'wall'" class="entity-glyph__line"><path d="M9 28V14h5v4h4v-4h5v4h4v10H9Z" /></g>
      <g v-else-if="icon.variant === 'fort' || icon.variant === 'building'" class="entity-glyph__line"><path d="M9 28V15l9-7 9 7v13H9Z" /><path d="M14 28v-7h8v7M9 16h18" /></g>
      <g v-else-if="icon.variant === 'wizard'" class="entity-glyph__line"><path d="m18 8 8 15H10L18 8Z" /><path d="M14 25h8v3h-8zM15 18h6" /></g>
      <g v-else-if="icon.variant === 'dragon'" class="entity-glyph__line"><path d="M11 24c2-10 12-14 15-7 2 5-5 10-13 8l-4 3 2-4Z" /><path d="m19 14 4-4m-2 6h.1" /></g>
      <g v-else-if="icon.variant === 'archer'" class="entity-glyph__line"><path d="M10 27 25 10M13 10h12v12M13 10l12 12" /></g>
      <g v-else-if="icon.variant === 'giant'" class="entity-glyph__line"><path d="M12 28V15a6 6 0 0 1 12 0v13M9 21h18M15 15h6" /></g>
      <g v-else-if="icon.variant === 'troop'" class="entity-glyph__line"><path d="m18 8 8 6-3 14H13l-3-14 8-6Z" /><path d="M15 18h6M18 14v9" /></g>
      <g v-else-if="icon.variant === 'siege'" class="entity-glyph__line"><path d="M10 23h16l-3-10h-10l-3 10Z" /><circle cx="14" cy="26" r="2" /><circle cx="22" cy="26" r="2" /></g>
      <g v-else-if="icon.variant === 'hero'" class="entity-glyph__line"><path d="m10 13 4 4 4-7 4 7 4-4v11H10V13Z" /><path d="M13 27h10" /></g>
      <g v-else-if="icon.variant === 'pet'" class="entity-glyph__line"><circle cx="12" cy="14" r="2" /><circle cx="18" cy="11" r="2" /><circle cx="24" cy="14" r="2" /><path d="M12 25c0-4 3-7 6-7s6 3 6 7c0 3-12 3-12 0Z" /></g>
      <g v-else class="entity-glyph__line"><path d="M10 11h16v16H10zM14 15h8m-8 4h8m-8 4h5" /></g>

      <circle :cx="markerX" :cy="markerY" r="1.35" class="entity-glyph__marker" />
    </svg>
  </span>
</template>

<style scoped>
.entity-glyph { display: grid; flex: 0 0 auto; place-items: center; width: 42px; height: 42px; color: #2f8e63; }
.entity-glyph--small { width: 32px; height: 32px; }
.entity-glyph svg { width: 100%; height: 100%; overflow: visible; }
.entity-glyph__surface { fill: #e8f5ed; stroke: #cce4d5; }
.entity-glyph__line { stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.entity-glyph__marker { fill: #d9a72e; }
.entity-glyph--trap { color: #c57b31; }
.entity-glyph--troop { color: #357c9c; }
.entity-glyph--spell { color: #7862a7; }
.entity-glyph--siege { color: #7c6443; }
.entity-glyph--hero { color: #a96e3b; }
.entity-glyph--pet { color: #4e8b76; }
.entity-glyph--builder { color: #467d68; }
</style>
