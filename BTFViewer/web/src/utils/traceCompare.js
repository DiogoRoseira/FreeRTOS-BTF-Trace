/**
 * Compare summary and per-task metrics between two loaded traces.
 * Optional lo/hi per trace for cursor-scoped compare.
 */

import { formatTime, isStiTagChannel } from '../renderer/TimelineRenderer.js'
import { parseTaskName, taskDisplayName, taskLabelForMergeKey, taskReprGet, isIdleTaskName } from './colors.js'
import { schedulingStats } from './statsAnalysis.js'
import { isMigratedTask, migrationRows } from './migrationAnalysis.js'
import { getPlacedCursors } from './statsRange.js'

export function cursorRangeForCursors(cursors) {
  const placed = getPlacedCursors(cursors || [])
  if (placed.length < 2) return { lo: null, hi: null }
  const sorted = [...placed].sort((a, b) => a - b)
  return { lo: sorted[0], hi: sorted[sorted.length - 1] }
}

export function traceSummarySnapshot(trace, lo = null, hi = null) {
  if (!trace) return null
  const fullSpan = trace.timeMax - trace.timeMin
  const spanNs = (lo != null && hi != null) ? Math.max(0, hi - lo) : fullSpan
  const stiEvents = (trace.stiEvents || []).filter(ev => {
    if (isStiTagChannel(ev.target)) return false
    if (lo != null && hi != null) return ev.time >= lo && ev.time <= hi
    return true
  }).length
  const { contextSwitches, coreGaps } = schedulingStats(trace, lo, hi)
  const gapAvgNs = coreGaps.length
    ? Math.round(coreGaps.reduce((a, b) => a + b, 0) / coreGaps.length)
    : 0
  const gapMaxNs = coreGaps.length ? Math.max(...coreGaps) : 0
  let migrations = trace.migrations?.length ?? 0
  let migratedTasks = (trace.tasks || []).filter(mk => isMigratedTask(trace, mk)).length
  if (lo != null && hi != null) {
    migrations = (trace.migrations || []).filter(m => m.ns >= lo && m.ns <= hi).length
    migratedTasks = migrationRows(trace, lo, hi, formatTime).length
  }
  return {
    spanNs,
    tasks: trace.tasks?.length ?? 0,
    segments: lo != null && hi != null
      ? trace.segments.filter(s => s.end > lo && s.start < hi).length
      : (trace.segments?.length ?? 0),
    stiEvents,
    contextSwitches,
    gapAvgNs,
    gapMaxNs,
    migrations,
    migratedTasks,
    timeScale: trace.timeScale,
  }
}

/** Top tasks by CPU% keyed by display name. */
export function topTasksCpuByName(trace, limit = 10, lo = null, hi = null) {
  if (!trace?.segByMergeKey) return new Map()
  const total = (lo != null && hi != null)
    ? Math.max(1, hi - lo)
    : Math.max(1, trace.timeMax - trace.timeMin)
  const accum = new Map()
  for (const [mk, segs] of trace.segByMergeKey) {
    const repr = taskReprGet(trace, mk) ?? mk
    const { name } = parseTaskName(repr)
    if (isIdleTaskName(name) || name === 'TICK') continue
    let t = 0
    for (const s of segs) {
      if (lo != null && hi != null) {
        if (s.end <= lo || s.start >= hi) continue
        t += Math.min(s.end, hi) - Math.max(s.start, lo)
      } else {
        t += s.end - s.start
      }
    }
    if (t > 0) accum.set(mk, t)
  }
  const sorted = [...accum.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  const out = new Map()
  for (const [mk, t] of sorted) {
    const name = taskDisplayName(taskReprGet(trace, mk) ?? mk)
    out.set(name, 100.0 * t / total)
  }
  return out
}

function fmtSignedTime(deltaNs, scale) {
  if (deltaNs === 0) return '0'
  const sign = deltaNs > 0 ? '+' : '−'
  return `${sign}${formatTime(Math.abs(deltaNs), scale)}`
}

function fmtSignedInt(delta) {
  if (delta === 0) return '0'
  return delta > 0 ? `+${delta}` : String(delta)
}

function fmtSignedPct(delta) {
  if (Math.abs(delta) < 0.05) return '0.0'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}`
}

function rangeForTab(tab, scopeEnabled) {
  if (!scopeEnabled || !tab) return { lo: null, hi: null }
  return cursorRangeForCursors(tab.cursors)
}

export function buildSummaryCompareRows(traceA, traceB, tabA = null, tabB = null, scopeEnabled = false) {
  const ra = rangeForTab(tabA, scopeEnabled)
  const rb = rangeForTab(tabB, scopeEnabled)
  const a = traceSummarySnapshot(traceA, ra.lo, ra.hi)
  const b = traceSummarySnapshot(traceB, rb.lo, rb.hi)
  if (!a || !b) return []
  const scale = a.timeScale || b.timeScale || 'ns'
  return [
    {
      label: scopeEnabled ? 'Span (cursor range)' : 'Span',
      a: formatTime(a.spanNs, scale),
      b: formatTime(b.spanNs, scale),
      delta: fmtSignedTime(a.spanNs - b.spanNs, scale),
    },
    { label: 'Tasks', a: a.tasks, b: b.tasks, delta: fmtSignedInt(a.tasks - b.tasks) },
    { label: 'Segments', a: a.segments, b: b.segments, delta: fmtSignedInt(a.segments - b.segments) },
    { label: 'STI events', a: a.stiEvents, b: b.stiEvents, delta: fmtSignedInt(a.stiEvents - b.stiEvents) },
    {
      label: 'Context switches',
      a: a.contextSwitches,
      b: b.contextSwitches,
      delta: fmtSignedInt(a.contextSwitches - b.contextSwitches),
    },
    {
      label: 'Core gap avg',
      a: formatTime(a.gapAvgNs, scale),
      b: formatTime(b.gapAvgNs, scale),
      delta: fmtSignedTime(a.gapAvgNs - b.gapAvgNs, scale),
    },
    {
      label: 'Core gap max',
      a: formatTime(a.gapMaxNs, scale),
      b: formatTime(b.gapMaxNs, scale),
      delta: fmtSignedTime(a.gapMaxNs - b.gapMaxNs, scale),
    },
    {
      label: 'Migrations (total)',
      a: a.migrations,
      b: b.migrations,
      delta: fmtSignedInt(a.migrations - b.migrations),
    },
    {
      label: 'Migrated tasks',
      a: a.migratedTasks,
      b: b.migratedTasks,
      delta: fmtSignedInt(a.migratedTasks - b.migratedTasks),
    },
  ]
}

export function buildTopTasksCompareRows(traceA, traceB, tabA = null, tabB = null, scopeEnabled = false, limit = 10) {
  const ra = rangeForTab(tabA, scopeEnabled)
  const rb = rangeForTab(tabB, scopeEnabled)
  const mapA = topTasksCpuByName(traceA, limit, ra.lo, ra.hi)
  const mapB = topTasksCpuByName(traceB, limit, rb.lo, rb.hi)
  const names = new Set([...mapA.keys(), ...mapB.keys()])
  return [...names]
    .sort((x, y) => {
      const maxX = Math.max(mapA.get(x) || 0, mapB.get(x) || 0)
      const maxY = Math.max(mapA.get(y) || 0, mapB.get(y) || 0)
      return maxY - maxX || x.localeCompare(y)
    })
    .map((name) => {
      const cpuA = mapA.get(name)
      const cpuB = mapB.get(name)
      const aVal = cpuA ?? 0
      const bVal = cpuB ?? 0
      return {
        name,
        cpuA: cpuA != null ? cpuA.toFixed(1) : '—',
        cpuB: cpuB != null ? cpuB.toFixed(1) : '—',
        delta: fmtSignedPct(aVal - bVal),
      }
    })
}

export function buildMigrationCompareRows(traceA, traceB, tabA = null, tabB = null, scopeEnabled = false) {
  const ra = rangeForTab(tabA, scopeEnabled)
  const rb = rangeForTab(tabB, scopeEnabled)
  const mapA = new Map()
  const mapB = new Map()
  if (traceA) {
    for (const row of migrationRows(traceA, ra.lo, ra.hi, formatTime)) {
      mapA.set(row.mk, row)
    }
  }
  if (traceB) {
    for (const row of migrationRows(traceB, rb.lo, rb.hi, formatTime)) {
      mapB.set(row.mk, row)
    }
  }
  const keys = [...new Set([...mapA.keys(), ...mapB.keys()])]
  keys.sort((a, b) => {
    const na = (mapA.get(a) || mapB.get(a))?.name ?? taskLabelForMergeKey(traceA || traceB, a)
    const nb = (mapA.get(b) || mapB.get(b))?.name ?? taskLabelForMergeKey(traceA || traceB, b)
    return na.localeCompare(nb)
  })
  return keys.map((mk) => {
    const raRow = mapA.get(mk)
    const rbRow = mapB.get(mk)
    const ma = raRow?.migrations ?? 0
    const mb = rbRow?.migrations ?? 0
    return {
      mk,
      name: raRow?.name ?? rbRow?.name ?? taskLabelForMergeKey(traceA || traceB, mk),
      migrationsA: ma,
      migrationsB: mb,
      delta: ma - mb,
      pingA: raRow?.pingPong ?? 0,
      pingB: rbRow?.pingPong ?? 0,
    }
  })
}
