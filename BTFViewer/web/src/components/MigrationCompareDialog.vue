<template>
  <div
    class="compare-dialog-overlay"
    @click.self="emit('close')"
  >
    <div
      class="compare-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Compare core migrations"
    >
      <div class="compare-dialog-header">
        <div class="compare-dialog-title">Compare Core Migrations</div>
        <button
          type="button"
          class="compare-close-btn"
          @click="emit('close')"
        >
          Close
        </button>
      </div>

      <div class="compare-select-row">
        <label class="compare-select-label">
          Trace A:
          <select
            v-model="tabAId"
            class="compare-select"
          >
            <option
              v-for="tab in tabs"
              :key="tab.id"
              :value="tab.id"
            >
              {{ tab.name }}
            </option>
          </select>
        </label>
        <label class="compare-select-label">
          Trace B:
          <select
            v-model="tabBId"
            class="compare-select"
          >
            <option
              v-for="tab in tabs"
              :key="tab.id"
              :value="tab.id"
            >
              {{ tab.name }}
            </option>
          </select>
        </label>
      </div>

      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Migrations A</th>
              <th>Migrations B</th>
              <th>Δ</th>
              <th>Ping-pong A</th>
              <th>Ping-pong B</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in compareRows"
              :key="row.mk"
            >
              <td class="task-col">{{ row.name }}</td>
              <td>{{ row.migrationsA }}</td>
              <td>{{ row.migrationsB }}</td>
              <td>{{ row.delta }}</td>
              <td>{{ row.pingA }}</td>
              <td>{{ row.pingB }}</td>
            </tr>
            <tr v-if="compareRows.length === 0">
              <td
                colspan="6"
                class="compare-empty"
              >
                No migrated tasks in either trace
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { formatTime } from '../renderer/TimelineRenderer.js'
import { migrationRows } from '../utils/migrationAnalysis.js'

const props = defineProps({
  tabs: { type: Array, required: true },
})

const emit = defineEmits(['close'])

const tabAId = ref(props.tabs[0]?.id ?? null)
const tabBId = ref(props.tabs[Math.min(1, props.tabs.length - 1)]?.id ?? null)

watch(
  () => props.tabs,
  (next) => {
    if (!next.some(t => t.id === tabAId.value)) tabAId.value = next[0]?.id ?? null
    if (!next.some(t => t.id === tabBId.value)) {
      tabBId.value = next[Math.min(1, next.length - 1)]?.id ?? null
    }
  },
  { deep: true },
)

function rowsByMk(trace) {
  const map = new Map()
  if (!trace) return map
  for (const row of migrationRows(trace, null, null, formatTime)) {
    map.set(row.mk, row)
  }
  return map
}

const compareRows = computed(() => {
  const traceA = props.tabs.find(t => t.id === tabAId.value)?.trace ?? null
  const traceB = props.tabs.find(t => t.id === tabBId.value)?.trace ?? null
  const mapA = rowsByMk(traceA)
  const mapB = rowsByMk(traceB)
  const keys = [...new Set([...mapA.keys(), ...mapB.keys()])]
  keys.sort((a, b) => {
    const na = (mapA.get(a) || mapB.get(a))?.name ?? a
    const nb = (mapA.get(b) || mapB.get(b))?.name ?? b
    return na.localeCompare(nb)
  })
  return keys.map((mk) => {
    const ra = mapA.get(mk)
    const rb = mapB.get(mk)
    const ma = ra?.migrations ?? 0
    const mb = rb?.migrations ?? 0
    return {
      mk,
      name: (ra || rb)?.name ?? mk,
      migrationsA: ma,
      migrationsB: mb,
      delta: ma - mb,
      pingA: ra?.pingPong ?? 0,
      pingB: rb?.pingPong ?? 0,
    }
  })
})
</script>

<style scoped>
.compare-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.compare-dialog {
  width: min(720px, 92vw);
  max-height: min(82vh, 520px);
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.compare-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.compare-dialog-title {
  font-size: 13px;
  font-weight: 700;
}

.compare-close-btn {
  appearance: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  color: var(--fg-dim);
  font-size: 11px;
  padding: 4px 10px;
  cursor: pointer;
}

.compare-close-btn:hover {
  background: var(--tb-btn-hover);
  color: var(--fg);
}

.compare-select-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.compare-select-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--fg-dim);
  flex: 1;
  min-width: 200px;
}

.compare-select {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--fg);
  font-size: 11px;
}

.compare-table-wrap {
  flex: 1;
  overflow: auto;
  padding: 0 14px 14px;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.compare-table th,
.compare-table td {
  padding: 4px 6px;
  border-bottom: 1px solid var(--border);
  text-align: right;
  white-space: nowrap;
}

.compare-table th:first-child,
.compare-table td.task-col {
  text-align: left;
}

.compare-table th {
  position: sticky;
  top: 0;
  background: var(--panel-bg);
  color: var(--fg-dim);
  font-weight: 600;
  z-index: 1;
}

.compare-empty {
  text-align: center !important;
  color: var(--fg-dim);
  padding: 16px 6px !important;
}
</style>
