<template>
  <div class="stats-panel">
    <!-- Summary -->
    <div class="stats-summary">
      <div class="summary-row">
        <span class="summary-key">Span</span>
        <span class="summary-val">{{ spanStr }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-key">Tasks</span>
        <span class="summary-val">{{ trace.tasks.length }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-key">Segments</span>
        <span class="summary-val">{{ trace.segments.length.toLocaleString() }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-key">STI Events</span>
        <span class="summary-val">{{ trace.stiEvents.length.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Core utilization -->
    <template v-if="trace.coreNames && trace.coreNames.length > 0">
      <div class="stats-sep" />
      <div
        class="stats-section-title collapsible"
        @click="coresCollapsed = !coresCollapsed"
      >
        <svg
          class="chevron"
          :class="{ collapsed: coresCollapsed }"
          viewBox="0 0 10 10"
          width="10"
          height="10"
        >
          <polyline
            points="2,3 5,7 8,3"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Core Utilisation (excl. IDLE/TICK)
      </div>
      <template v-if="!coresCollapsed">
        <div
          v-for="cs in coreStats"
          :key="cs.core"
          class="core-stat-row"
        >
          <span class="core-name">{{ cs.core }}</span>
          <div class="prog-bar">
            <div
              class="prog-fill"
              :style="{ width: clampPct(cs.pct) + '%' }"
            />
          </div>
          <span class="core-pct">{{ cs.pct.toFixed(1) }}%</span>
        </div>
      </template>
    </template>

    <!-- Top tasks -->
    <div class="stats-sep" />
    <div
      class="stats-section-title collapsible"
      @click="tasksCollapsed = !tasksCollapsed"
    >
      <svg
        class="chevron"
        :class="{ collapsed: tasksCollapsed }"
        viewBox="0 0 10 10"
        width="10"
        height="10"
      >
        <polyline
          points="2,3 5,7 8,3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Top Tasks by CPU (excl. IDLE/TICK)
    </div>
    <template v-if="!tasksCollapsed">
      <div
        v-if="topTasks.length === 0"
        class="range-hint"
      >
        No user tasks found
      </div>
      <div
        v-for="t in topTasks"
        :key="t.mk"
        class="task-stat-row"
      >
        <span class="task-stat-name">{{ t.name }}</span>
        <div class="prog-bar">
          <div
            class="prog-fill"
            :style="{ width: clampPct(t.pct) + '%' }"
          />
        </div>
        <span class="task-stat-pct">{{ t.pct.toFixed(1) }}%</span>
      </div>
    </template>

    <!-- Execution time per slice -->
    <div class="stats-sep" />
    <div
      class="stats-section-title collapsible"
      @click="execSliceCollapsed = !execSliceCollapsed"
    >
      <svg
        class="chevron"
        :class="{ collapsed: execSliceCollapsed }"
        viewBox="0 0 10 10"
        width="10"
        height="10"
      >
        <polyline
          points="2,3 5,7 8,3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Execution Time Per Slice
    </div>
    <template v-if="!execSliceCollapsed">
      <div
        v-if="execSliceStats.length === 0"
        class="range-hint"
      >
        No user-task slices found
      </div>
      <div
        v-else
        class="stats-table-wrap"
      >
        <table class="stats-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Runs</th>
              <th>CPU%</th>
              <th>Min</th>
              <th>Avg</th>
              <th>Max</th>
              <th>p95</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in execSliceStats"
              :key="row.mk"
            >
              <td class="task-col">{{ row.name }}</td>
              <td>{{ row.runs }}</td>
              <td>{{ row.cpuPct.toFixed(1) }}%</td>
              <td>{{ row.min }}</td>
              <td>{{ row.avg }}</td>
              <td>{{ row.max }}</td>
              <td>{{ row.p95 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Inter-arrival time -->
    <div class="stats-sep" />
    <div
      class="stats-section-title collapsible"
      @click="interArrivalCollapsed = !interArrivalCollapsed"
    >
      <svg
        class="chevron"
        :class="{ collapsed: interArrivalCollapsed }"
        viewBox="0 0 10 10"
        width="10"
        height="10"
      >
        <polyline
          points="2,3 5,7 8,3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Inter-Arrival Time
    </div>
    <template v-if="!interArrivalCollapsed">
      <div
        v-if="interArrivalStats.length === 0"
        class="range-hint"
      >
        Need at least 2 activations per task
      </div>
      <div
        v-else
        class="stats-table-wrap"
      >
        <table class="stats-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Runs</th>
              <th>Min</th>
              <th>Avg</th>
              <th>Max</th>
              <th>p95</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in interArrivalStats"
              :key="row.mk"
            >
              <td class="task-col">{{ row.name }}</td>
              <td>{{ row.runs }}</td>
              <td>{{ row.min }}</td>
              <td>{{ row.avg }}</td>
              <td>{{ row.max }}</td>
              <td>{{ row.p95 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Export -->
    <div class="stats-export-row">
      <button
        class="action-btn"
        @click="exportCsv"
      >
        Export CSV
      </button>
      <button
        class="action-btn"
        @click="exportHtml"
      >
        Export HTML
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { formatTime } from '../renderer/TimelineRenderer.js'
import { taskDisplayName, parseTaskName, taskMergeKey, isIdleTaskName } from '../utils/colors.js'

const props = defineProps({
  trace:   { type: Object, required: true },
  cursors: { type: Array, default: () => [] },
})

const coresCollapsed = ref(false)
const tasksCollapsed = ref(false)
const execSliceCollapsed = ref(false)
const interArrivalCollapsed = ref(false)

function clampPct(v) { return Math.max(0, Math.min(100, v)).toFixed(1) }

const spanStr = computed(() => formatTime(props.trace.timeMax - props.trace.timeMin, props.trace.timeScale))

// ---- Core utilisation (excl. IDLE/TICK) — only computed when visible ----
const coreStats = computed(() => {
  if (coresCollapsed.value) return []
  const tr = props.trace  // explicit dep on the trace object
  if (!tr || !tr.coreNames || tr.coreNames.length === 0) return []
  const total = tr.timeMax - tr.timeMin
  if (total <= 0) return []
  return tr.coreNames.map(core => {
    const segs = tr.coreSegs.get(core) || []
    let active = 0
    for (const s of segs) {
      const { name } = parseTaskName(s.task)
      if (name === 'TICK' || isIdleTaskName(name)) continue
      active += s.end - s.start
    }
    return { core, pct: 100.0 * active / total }
  })
})

// ---- Top 10 tasks by CPU — only computed when visible ------------------
const topTasks = computed(() => {
  if (tasksCollapsed.value) return []
  const tr = props.trace  // explicit dep on the trace object
  if (!tr || !tr.segByMergeKey) return []
  const total = tr.timeMax - tr.timeMin
  if (total <= 0) return []
  const accum = new Map()
  for (const [mk, segs] of tr.segByMergeKey) {
    const repr = tr.taskRepr.get(mk) || mk
    const { name } = parseTaskName(repr)
    if (isIdleTaskName(name) || name === 'TICK') continue
    let t = 0
    for (const s of segs) t += s.end - s.start
    if (t > 0) accum.set(mk, t)
  }
  return [...accum.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([mk, t]) => ({
      mk,
      name: taskDisplayName(tr.taskRepr.get(mk) || mk),
      pct: 100.0 * t / total,
    }))
})

function _summarizeSamples(samples, scale) {
  if (!samples || samples.length === 0) return null
  const sorted = [...samples].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)
  const p95Idx = Math.min(n - 1, Math.ceil(n * 0.95) - 1)
  return {
    min: formatTime(sorted[0], scale),
    avg: formatTime(Math.round(sum / n), scale),
    max: formatTime(sorted[n - 1], scale),
    p95: formatTime(sorted[p95Idx], scale),
  }
}

const execSliceStats = computed(() => {
  if (execSliceCollapsed.value) return []
  const tr = props.trace
  if (!tr || !tr.segByMergeKey) return []
  const scale = tr.timeScale
  const total = tr.timeMax - tr.timeMin
  const rows = []

  for (const [mk, segs] of tr.segByMergeKey) {
    if (!segs || segs.length === 0) continue
    const repr = tr.taskRepr.get(mk) || mk
    const { name } = parseTaskName(repr)
    if (isIdleTaskName(name) || name === 'TICK') continue

    const samples = []
    for (const s of segs) {
      const d = s.end - s.start
      if (d > 0) samples.push(d)
    }
    const summary = _summarizeSamples(samples, scale)
    if (!summary) continue
    const taskTotal = samples.reduce((a, b) => a + b, 0)

    rows.push({
      mk,
      name: taskDisplayName(repr),
      runs: samples.length,
      cpuPct: total > 0 ? (100.0 * taskTotal / total) : 0,
      min: summary.min,
      avg: summary.avg,
      max: summary.max,
      p95: summary.p95,
    })
  }

  return rows.sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name))
})

const interArrivalStats = computed(() => {
  if (interArrivalCollapsed.value) return []
  const tr = props.trace
  if (!tr || !tr.segByMergeKey) return []
  const scale = tr.timeScale
  const rows = []

  for (const [mk, segs] of tr.segByMergeKey) {
    if (!segs || segs.length < 2) continue
    const repr = tr.taskRepr.get(mk) || mk
    const { name } = parseTaskName(repr)
    if (isIdleTaskName(name) || name === 'TICK') continue

    const starts = [...segs].map(s => s.start).sort((a, b) => a - b)
    const samples = []
    for (let i = 1; i < starts.length; i++) {
      const d = starts[i] - starts[i - 1]
      if (d > 0) samples.push(d)
    }
    const summary = _summarizeSamples(samples, scale)
    if (!summary) continue

    rows.push({
      mk,
      name: taskDisplayName(repr),
      runs: starts.length,
      min: summary.min,
      avg: summary.avg,
      max: summary.max,
      p95: summary.p95,
    })
  }

  return rows.sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name))
})

function _htmlCell(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function _csvCell(v) {
  const s = String(v ?? '').replace(/[µμ]s/g, 'us')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function _downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function _stamp() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function exportCsv() {
  const tr = props.trace
  const execReportRows = _execSliceRowsForReport(tr)
  const interReportRows = _interArrivalRowsForReport(tr)
  const coreRows = _coreUtilRows(tr)
  const taskRows = _taskCpuRows(tr)
  const lines = []

  lines.push('Summary')
  lines.push('Metric,Value')
  lines.push(`Span,${_csvCell(spanStr.value)}`)
  lines.push(`Tasks,${_csvCell(tr.tasks.length)}`)
  lines.push(`Segments,${_csvCell(tr.segments.length)}`)
  lines.push(`STI Events,${_csvCell(tr.stiEvents.length)}`)

  if (rangeStats.value) {
    lines.push('')
    lines.push('Cursor Range')
    lines.push('Metric,Value')
    lines.push(`Span,${_csvCell(rangeStats.value.span)}`)
    lines.push(`Slices,${_csvCell(rangeStats.value.switches)}`)
    if (rangeStats.value.topTask) lines.push(`Top task,${_csvCell(`${rangeStats.value.topTask} (${rangeStats.value.topPct}%)`)}`)
    if (rangeStats.value.dMin) lines.push(`Seg min,${_csvCell(rangeStats.value.dMin)}`)
    if (rangeStats.value.dAvg) lines.push(`Seg avg,${_csvCell(rangeStats.value.dAvg)}`)
    if (rangeStats.value.dMax) lines.push(`Seg max,${_csvCell(rangeStats.value.dMax)}`)
  }

  lines.push('')
  lines.push('Core Utilisation (excl. IDLE/TICK)')
  lines.push('Core,CPU %')
  if (coreRows.length > 0) {
    for (const r of coreRows) {
      lines.push(`${_csvCell(r.core)},${_csvCell(`${r.pct}%`)}`)
    }
  } else {
    lines.push('No data,')
  }

  lines.push('')
  lines.push('Top Tasks by CPU (excl. IDLE/TICK)')
  lines.push('Task,CPU %')
  if (taskRows.length > 0) {
    for (const r of taskRows) {
      lines.push(`${_csvCell(r.name)},${_csvCell(`${r.pct}%`)}`)
    }
  } else {
    lines.push('No data,')
  }

  lines.push('')
  lines.push('Execution Time Per Slice')
  lines.push('Task,Runs,CPU%,Min,Avg,TrimMean(5%),Max,p50,p95')
  for (const r of execReportRows) {
    lines.push([
      _csvCell(r.name),
      _csvCell(r.runs),
      _csvCell(`${r.cpuPct.toFixed(1)}%`),
      _csvCell(r.min),
      _csvCell(r.avg),
      _csvCell(r.trimMean),
      _csvCell(r.max),
      _csvCell(r.p50),
      _csvCell(r.p95),
    ].join(','))
  }

  lines.push('')
  lines.push('Inter-Arrival Time')
  lines.push('Task,Runs,Min,Avg,TrimMean(5%),Max,p50,p95')
  for (const r of interReportRows) {
    lines.push([
      _csvCell(r.name),
      _csvCell(r.runs),
      _csvCell(r.min),
      _csvCell(r.avg),
      _csvCell(r.trimMean),
      _csvCell(r.max),
      _csvCell(r.p50),
      _csvCell(r.p95),
    ].join(','))
  }

  _downloadText(`statistics-${_stamp()}.csv`, `\uFEFF${lines.join('\n')}`, 'text/csv;charset=utf-8')
}

function _summarizeSamplesReport(samples, scale) {
  if (!samples || samples.length === 0) return null
  const sorted = [...samples].sort((a, b) => a - b)
  const n = sorted.length
  const p50Idx = Math.min(n - 1, Math.ceil(n * 0.50) - 1)
  const p95Idx = Math.min(n - 1, Math.ceil(n * 0.95) - 1)
  const sum = sorted.reduce((a, b) => a + b, 0)
  const trimCount = Math.floor(n * 0.05)
  const trimVals = (trimCount * 2) < n ? sorted.slice(trimCount, n - trimCount) : sorted
  const trimSum = trimVals.reduce((a, b) => a + b, 0)
  return {
    min: formatTime(sorted[0], scale),
    avg: formatTime(Math.round(sum / n), scale),
    trimMean: formatTime(Math.round(trimSum / trimVals.length), scale),
    max: formatTime(sorted[n - 1], scale),
    p50: formatTime(sorted[p50Idx], scale),
    p95: formatTime(sorted[p95Idx], scale),
  }
}

function _execSliceRowsForReport(tr) {
  if (!tr || !tr.segByMergeKey) return []
  const scale = tr.timeScale
  const total = tr.timeMax - tr.timeMin
  const rows = []

  for (const [mk, segs] of tr.segByMergeKey) {
    if (!segs || segs.length === 0) continue
    const repr = tr.taskRepr.get(mk) || mk
    const { name } = parseTaskName(repr)
    if (isIdleTaskName(name) || name === 'TICK') continue

    const samples = []
    for (const s of segs) {
      const d = s.end - s.start
      if (d > 0) samples.push(d)
    }
    const summary = _summarizeSamplesReport(samples, scale)
    if (!summary) continue
    const taskTotal = samples.reduce((a, b) => a + b, 0)

    rows.push({
      mk,
      name: taskDisplayName(repr),
      runs: samples.length,
      cpuPct: total > 0 ? (100.0 * taskTotal / total) : 0,
      min: summary.min,
      avg: summary.avg,
      trimMean: summary.trimMean,
      max: summary.max,
      p50: summary.p50,
      p95: summary.p95,
    })
  }

  return rows.sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name))
}

function _interArrivalRowsForReport(tr) {
  if (!tr || !tr.segByMergeKey) return []
  const scale = tr.timeScale
  const rows = []

  for (const [mk, segs] of tr.segByMergeKey) {
    if (!segs || segs.length < 2) continue
    const repr = tr.taskRepr.get(mk) || mk
    const { name } = parseTaskName(repr)
    if (isIdleTaskName(name) || name === 'TICK') continue

    const starts = [...segs].map(s => s.start).sort((a, b) => a - b)
    const samples = []
    for (let i = 1; i < starts.length; i++) {
      const d = starts[i] - starts[i - 1]
      if (d > 0) samples.push(d)
    }
    const summary = _summarizeSamplesReport(samples, scale)
    if (!summary) continue

    rows.push({
      mk,
      name: taskDisplayName(repr),
      runs: starts.length,
      min: summary.min,
      avg: summary.avg,
      trimMean: summary.trimMean,
      max: summary.max,
      p50: summary.p50,
      p95: summary.p95,
    })
  }

  return rows.sort((a, b) => b.runs - a.runs || a.name.localeCompare(b.name))
}

function _renderHtmlTable(title, rows, includeCpu = false) {
  const head = includeCpu
    ? '<tr><th>Task</th><th>Runs</th><th>CPU%</th><th>Min</th><th>Avg</th><th>Max</th><th>p95</th></tr>'
    : '<tr><th>Task</th><th>Runs</th><th>Min</th><th>Avg</th><th>Max</th><th>p95</th></tr>'
  const body = rows.length
    ? rows.map(r => includeCpu
      ? `<tr><td>${_htmlCell(r.name)}</td><td>${_htmlCell(r.runs)}</td><td>${_htmlCell(r.cpuPct.toFixed(1))}%</td><td>${_htmlCell(r.min)}</td><td>${_htmlCell(r.avg)}</td><td>${_htmlCell(r.max)}</td><td>${_htmlCell(r.p95)}</td></tr>`
      : `<tr><td>${_htmlCell(r.name)}</td><td>${_htmlCell(r.runs)}</td><td>${_htmlCell(r.min)}</td><td>${_htmlCell(r.avg)}</td><td>${_htmlCell(r.max)}</td><td>${_htmlCell(r.p95)}</td></tr>`,
    ).join('')
    : `<tr><td colspan="${includeCpu ? 7 : 6}" class="empty">No data</td></tr>`
  return `<section class="report-card"><h2>${_htmlCell(title)}</h2><table><thead>${head}</thead><tbody>${body}</tbody></table></section>`
}

function _renderHtmlTableReport(title, rows, includeCpu = false) {
  const head = includeCpu
    ? '<tr><th>Task</th><th>Runs</th><th>CPU%</th><th>Min</th><th>Avg</th><th>TrimMean(5%)</th><th>Max</th><th>p50</th><th>p95</th></tr>'
    : '<tr><th>Task</th><th>Runs</th><th>Min</th><th>Avg</th><th>TrimMean(5%)</th><th>Max</th><th>p50</th><th>p95</th></tr>'
  const body = rows.length
    ? rows.map(r => includeCpu
      ? `<tr><td>${_htmlCell(r.name)}</td><td>${_htmlCell(r.runs)}</td><td>${_htmlCell(r.cpuPct.toFixed(1))}%</td><td>${_htmlCell(r.min)}</td><td>${_htmlCell(r.avg)}</td><td>${_htmlCell(r.trimMean)}</td><td>${_htmlCell(r.max)}</td><td>${_htmlCell(r.p50)}</td><td>${_htmlCell(r.p95)}</td></tr>`
      : `<tr><td>${_htmlCell(r.name)}</td><td>${_htmlCell(r.runs)}</td><td>${_htmlCell(r.min)}</td><td>${_htmlCell(r.avg)}</td><td>${_htmlCell(r.trimMean)}</td><td>${_htmlCell(r.max)}</td><td>${_htmlCell(r.p50)}</td><td>${_htmlCell(r.p95)}</td></tr>`,
    ).join('')
    : `<tr><td colspan="${includeCpu ? 9 : 8}" class="empty">No data</td></tr>`
  return `<section class="report-card"><h2>${_htmlCell(title)}</h2><table><thead>${head}</thead><tbody>${body}</tbody></table></section>`
}

function _coreUtilRows(tr) {
  if (!tr || !tr.coreNames || tr.coreNames.length === 0) return []
  const total = tr.timeMax - tr.timeMin
  if (total <= 0) return []
  return tr.coreNames.map(core => {
    const segs = tr.coreSegs.get(core) || []
    let active = 0
    for (const s of segs) {
      const { name } = parseTaskName(s.task)
      if (name === 'TICK' || isIdleTaskName(name)) continue
      active += s.end - s.start
    }
    return {
      core,
      pct: (100.0 * active / total).toFixed(1),
    }
  })
}

function _taskCpuRows(tr) {
  if (!tr || !tr.segByMergeKey) return []
  const total = tr.timeMax - tr.timeMin
  if (total <= 0) return []
  const accum = new Map()
  for (const [mk, segs] of tr.segByMergeKey) {
    const repr = tr.taskRepr.get(mk) || mk
    const { name } = parseTaskName(repr)
    if (isIdleTaskName(name) || name === 'TICK') continue
    let t = 0
    for (const s of segs) t += s.end - s.start
    if (t > 0) accum.set(mk, t)
  }
  return [...accum.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([mk, t]) => ({
      name: taskDisplayName(tr.taskRepr.get(mk) || mk),
      pct: (100.0 * t / total).toFixed(1),
    }))
}

function exportHtml() {
  const tr = props.trace
  const range = rangeStats.value
  const execReportRows = _execSliceRowsForReport(tr)
  const interReportRows = _interArrivalRowsForReport(tr)
  const coreRows = _coreUtilRows(tr)
  const taskRows = _taskCpuRows(tr)
  const rangeHtml = range
    ? `<section class="report-card"><h2>Cursor Range</h2><table><tbody>
        <tr><th>Span</th><td>${_htmlCell(range.span)}</td></tr>
        <tr><th>Slices</th><td>${_htmlCell(range.switches)}</td></tr>
        ${range.topTask ? `<tr><th>Top task</th><td>${_htmlCell(`${range.topTask} (${range.topPct}%)`)}</td></tr>` : ''}
        ${range.dMin ? `<tr><th>Seg min</th><td>${_htmlCell(range.dMin)}</td></tr>` : ''}
        ${range.dAvg ? `<tr><th>Seg avg</th><td>${_htmlCell(range.dAvg)}</td></tr>` : ''}
        ${range.dMax ? `<tr><th>Seg max</th><td>${_htmlCell(range.dMax)}</td></tr>` : ''}
      </tbody></table></section>`
    : ''
  const coreHtml = `<section class="report-card"><h2>Core Utilisation (excl. IDLE/TICK)</h2><table><thead><tr><th>Core</th><th>CPU %</th></tr></thead><tbody>${coreRows.length
    ? coreRows.map(r => `<tr><td>${_htmlCell(r.core)}</td><td>${_htmlCell(r.pct)}%</td></tr>`).join('')
    : '<tr><td colspan="2" class="empty">No data</td></tr>'
  }</tbody></table></section>`
  const taskHtml = `<section class="report-card"><h2>Top Tasks by CPU (excl. IDLE/TICK)</h2><table><thead><tr><th>Task</th><th>CPU %</th></tr></thead><tbody>${taskRows.length
    ? taskRows.map(r => `<tr><td>${_htmlCell(r.name)}</td><td>${_htmlCell(r.pct)}%</td></tr>`).join('')
    : '<tr><td colspan="2" class="empty">No data</td></tr>'
  }</tbody></table></section>`

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>BTF Statistics Report</title>
  <style>
    :root {
      --bg: #e9edf3;
      --paper: #ffffff;
      --ink: #182230;
      --muted: #5f6f82;
      --line: #d9e0ea;
      --line-strong: #c8d2e0;
      --header: #16324f;
      --accent: #2a6fb2;
      --stripe: #f7f9fc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at top right, #f6f8fb 0%, var(--bg) 52%, #dde4ee 100%);
    }
    .report { max-width: 1160px; margin: 0 auto; }
    .report-head {
      background: linear-gradient(135deg, var(--header) 0%, #21496f 100%);
      color: #f3f7fd;
      border-radius: 14px;
      padding: 20px 24px;
      box-shadow: 0 10px 28px rgba(17, 44, 69, 0.24);
      margin-bottom: 18px;
    }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0.2px; }
    .sub { margin-top: 6px; color: #cfe1f7; font-size: 13px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 2px 8px rgba(30, 60, 90, 0.06);
    }
    .kpi .k { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; }
    .kpi .v { margin-top: 4px; font-size: 20px; font-weight: 700; color: #0f2b47; }
    .report-card {
      margin: 14px 0;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px 14px;
      box-shadow: 0 2px 10px rgba(30, 60, 90, 0.06);
    }
    h2 { margin: 0 0 10px 0; color: #123355; font-size: 17px; }
    .notes { border-left: 4px solid var(--accent); }
    .notes ul { margin: 8px 0 0 18px; padding: 0; }
    .notes li { margin: 6px 0; line-height: 1.45; }
    table { border-collapse: separate; border-spacing: 0; width: 100%; }
    th, td { border-bottom: 1px solid var(--line); padding: 8px 10px; font-size: 13px; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    thead th {
      background: #f1f5fb;
      color: #284563;
      font-weight: 600;
      border-top: 1px solid var(--line-strong);
      border-bottom: 1px solid var(--line-strong);
    }
    tbody tr:nth-child(even) td { background: var(--stripe); }
    .empty { text-align: center !important; color: var(--muted); }
    .report-foot { margin-top: 14px; color: var(--muted); font-size: 12px; text-align: right; }
  </style>
</head>
<body>
  <div class="report">
    <header class="report-head">
      <h1>BTF Statistics Report</h1>
      <div class="sub">Generated: ${_htmlCell(new Date().toLocaleString())}</div>
    </header>
    <section class="kpi-grid">
      <article class="kpi"><div class="k">Span</div><div class="v">${_htmlCell(spanStr.value)}</div></article>
      <article class="kpi"><div class="k">Tasks</div><div class="v">${_htmlCell(tr.tasks.length.toLocaleString())}</div></article>
      <article class="kpi"><div class="k">Segments</div><div class="v">${_htmlCell(tr.segments.length.toLocaleString())}</div></article>
      <article class="kpi"><div class="k">STI Events</div><div class="v">${_htmlCell(tr.stiEvents.length.toLocaleString())}</div></article>
    </section>
    <section class="report-card notes">
    <h2>Statistics Notes</h2>
    <ul>
      <li><strong>Execution Time Per Slice:</strong> Duration of each continuous task run between two context switches. Lower and tighter values indicate more predictable execution.</li>
      <li><strong>Inter-Arrival Time:</strong> Time between consecutive activations of the same task (slice start to next slice start). It reflects activation cadence and jitter.</li>
      <li><strong>Min (Minimum):</strong> The fastest execution time recorded. It represents the best-case scenario under zero system load.</li>
      <li><strong>Max (Maximum):</strong> The slowest execution time recorded. It identifies worst-case bottlenecks, spikes, or resource contention.</li>
      <li><strong>Average (Mean):</strong> Total execution time divided by the number of slices. It shows general performance but is heavily skewed by extreme outliers.</li>
      <li><strong>TrimMean(5%):</strong> Average after removing the fastest 5% and slowest 5% slices. It reflects typical performance while reducing outlier impact.</li>
      <li><strong>P50 (Median):</strong> The midpoint latency where half of slices are faster and half are slower. It captures typical-case behaviour.</li>
      <li><strong>P95 (95th Percentile):</strong> The threshold under which 95% of all slices execute. It is the best metric for user experience because it ignores rare anomalies while capturing real-world slowdowns.</li>
    </ul>
    </section>
    ${rangeHtml}
    ${coreHtml}
    ${taskHtml}
    ${_renderHtmlTableReport('Execution Time Per Slice', execReportRows, true)}
    ${_renderHtmlTableReport('Inter-Arrival Time', interReportRows)}
    <div class="report-foot">Generated by BTF Viewer</div>
  </div>
</body>
</html>`

  _downloadText(`statistics-${_stamp()}.html`, html, 'text/html;charset=utf-8')
}

// ---- Range statistics (from 2+ cursor positions) -----------------------
// Computed via a debounced watcher so cursor placement never blocks the UI.
const rangeStats = ref(null)
let _rangeTimer = null

function _computeRangeStats(cursors) {
  const placed = cursors.filter(c => c !== null)
  if (placed.length < 2) return null
  const sorted = [...placed].sort((a, b) => a - b)
  const lo = sorted[0]
  const hi = sorted[sorted.length - 1]
  const dt = hi - lo
  if (dt <= 0) return null

  const scale = props.trace.timeScale
  const taskAcc = new Map()
  const durations = []
  let switches = 0

  for (const seg of props.trace.segments) {
    if (seg.end <= lo || seg.start >= hi) continue
    const ov = Math.min(seg.end, hi) - Math.max(seg.start, lo)
    if (ov <= 0) continue
    switches++
    durations.push(seg.end - seg.start)
    const mk = taskMergeKey(seg.task)
    const repr = props.trace.taskRepr.get(mk) || seg.task
    const disp = taskDisplayName(repr)
    taskAcc.set(disp, (taskAcc.get(disp) || 0) + ov)
  }

  let topTask = null, topNs = 0
  for (const [k, v] of taskAcc) {
    if (v > topNs) { topNs = v; topTask = k }
  }

  const result = {
    span:     formatTime(dt, scale),
    switches,
    topTask,
    topPct:   topTask ? (100.0 * topNs / dt).toFixed(1) : null,
  }

  if (durations.length > 0) {
    const minD = Math.min(...durations)
    const maxD = Math.max(...durations)
    const avgD = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    result.dMin = formatTime(minD, scale)
    result.dMax = formatTime(maxD, scale)
    result.dAvg = formatTime(avgD, scale)
  }
  return result
}

watch(() => props.cursors, (cursors) => {
  clearTimeout(_rangeTimer)
  const placed = cursors.filter(c => c !== null)
  if (placed.length < 2) {
    rangeStats.value = null
    return
  }
  // Defer heavy segment scan so cursor placement feels instant
  _rangeTimer = setTimeout(() => {
    rangeStats.value = _computeRangeStats(cursors)
  }, 200)
}, { deep: true })
</script>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  font-size: 11px;
  font-family: monospace;
  overflow-y: auto;
  flex: 1;
  gap: 0;
}

.stats-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 4px;
}

.summary-key {
  color: var(--fg-dim);
  flex-shrink: 0;
}

.summary-val {
  color: var(--fg);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-sep {
  height: 1px;
  background: var(--border);
  margin: 6px 0;
  flex-shrink: 0;
}

.stats-section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--fg-dim);
  margin-bottom: 4px;
}

.stats-section-title.collapsible {
  cursor: pointer;
  user-select: none;
}

.stats-section-title.collapsible:hover {
  color: var(--fg);
}

.chevron {
  flex-shrink: 0;
  transition: transform 0.15s;
  color: var(--fg-dim);
}

.chevron.collapsed {
  transform: rotate(-90deg);
}

.range-hint {
  color: var(--fg-dim);
  opacity: 0.6;
  font-size: 10px;
  font-style: italic;
}

.core-stat-row,
.task-stat-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 3px;
}

.core-name {
  color: var(--fg-dim);
  min-width: 56px;
  flex-shrink: 0;
}

.task-stat-name {
  color: var(--fg);
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prog-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--border);
  overflow: hidden;
  flex-shrink: 0;
  min-width: 30px;
}

.prog-fill {
  height: 100%;
  background: #5FCF6F;
  border-radius: 4px;
  transition: width 0.2s;
}

.core-pct,
.task-stat-pct {
  color: #77BB77;
  min-width: 38px;
  text-align: right;
  flex-shrink: 0;
}

.stats-table-wrap {
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: auto;
  max-height: 220px;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

.stats-table th,
.stats-table td {
  padding: 3px 5px;
  border-bottom: 1px solid var(--border);
  text-align: right;
  white-space: nowrap;
}

.stats-table th {
  position: sticky;
  top: 0;
  background: var(--panel-bg);
  color: var(--fg-dim);
  font-weight: 600;
  z-index: 1;
}

.stats-table th:first-child,
.stats-table td.task-col {
  text-align: left;
}

.stats-table td.task-col {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stats-table tr:last-child td {
  border-bottom: none;
}

.stats-export-row {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-top: 1px solid var(--border);
}

.action-btn {
  flex: 1;
  padding: 3px 8px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--fg-dim);
  font-size: 11px;
  cursor: pointer;
}

.action-btn:hover {
  background: var(--tb-btn-hover);
  color: var(--fg);
}
</style>
