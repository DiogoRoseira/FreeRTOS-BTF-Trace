<template>
  <div
    v-if="lines && lines.length"
    class="seg-tooltip"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div
      v-for="(row, i) in lines"
      :key="i"
      class="seg-row"
    >
      <span class="seg-key">{{ row.key }}</span>
      <span
        class="seg-val"
        :class="{ bold: row.bold }"
      >{{ row.val }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  lines: { type: Array, default: () => [] },
  x:     { type: Number, default: 0 },
  y:     { type: Number, default: 0 },
})
</script>

<style scoped>
.seg-tooltip {
  position: absolute;
  z-index: 100;
  pointer-events: none;
  background: var(--panel-bg);
  border: 1px solid var(--accent);
  border-radius: 5px;
  padding: 6px 10px;
  font-family: monospace;
  font-size: 11px;
  max-width: 420px;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  transform: translate(10px, -50%);
}

.seg-row {
  display: flex;
  gap: 8px;
  line-height: 1.6;
}

.seg-key {
  color: var(--fg-dim);
  min-width: 72px;
  flex-shrink: 0;
}

.seg-val {
  color: var(--fg);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seg-val.bold {
  font-weight: 700;
}
</style>
