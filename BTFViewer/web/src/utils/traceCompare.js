/**
 * Compare summary and per-task metrics between two loaded traces (full trace, not cursor scope).
 */

import { formatTime, isStiTagChannel } from '../renderer/TimelineRenderer.js'
import { parseTaskName, taskDisplayName, taskLabelForMergeKey, taskReprGet, isIdleTaskName } from './colors.js'
import { schedulingStats } from './statsAnalysis.js'
import { isMigratedTask, migrationRows } from './migrationAnalysis.js'

export function traceSummarySnapshot(trace) {
  if (!trace) return null
  const spanNs = trace.timeMax - trace.timeMin
  const stiEvents = (trace.stiEvents || []).filter(ev => !isStiTagChannel(ev.target)).length
  const { contextSwitches, coreGaps } = schedulingStats(trace, null, null)
  const gapAvgNs = coreGaps.length
    ? Math.round(coreGaps.reduce((a, b) => a + b, 0) / coreGaps.length)
    : 0
  const gapMaxNs = coreGaps.length ? Math.max(...coreGaps) : 0
  const migratedTasks = (trace.tasks || []).filter(mk => isMigratedTask(trace, mk)).length
  return {
    spanNs,
    tasks: trace.tasks?.length ?? 0,
    segments: trace.segments?.length ?? 0,
    stiEvents,
    contextSwitches,
    gapAvgNs,
    gapMaxNs,
    migrations: trace.migrations?.length ?? 0,
    migratedTasks,
    timeScale: trace.timeScale,
  }
}

/** Top tasks by CPU% keyed by display name. */
export function topTasksCpuByName(trace, limit = 10) {
  if (!trace?.segByMergeKey) return new Map()
  const total = trace.timeMax - trace.timeMin
  if (total <= 0) return new Map()
  const accum = new Map()
  for (const [mk, segs] of trace.segByMergeKey) {
    const repr = taskReprGet(trace, mk) ?? mk
    const { name } = parseTaskName(repr)
    if (isIdleTaskName(name) || name === 'TICK') continue
    let t = 0
    for (const s of segs) t += s.end - s.start
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

export function buildSummaryCompareRows(traceA, traceB) {
  const a = traceSummarySnapshot(traceA)
  const b = traceSummarySnapshot(traceB)
  if (!a || !b) return []
  const scale = a.timeScale || b.timeScale || 'ns'
  const rows = [
    {
      label: 'Span',
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
  return rows
}

export function buildTopTasksCompareRows(traceA, traceB, limit = 10) {
  const mapA = topTasksCpuByName(traceA, limit)
  const mapB = topTasksCpuByName(traceB, limit)
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

export function buildMigrationCompareRows(traceA, traceB) {
  const mapA = new Map()
  const mapB = new Map()
  if (traceA) {
    for (const row of migrationRows(traceA, null, null, formatTime)) {
      mapA.set(row.mk, row)
    }
  }
  if (traceB) {
    for (const row of migrationRows(traceB, null, null, formatTime)) {
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
    const ra = mapA.get(mk)
    const rb = mapB.get(mk)
    const ma = ra?.migrations ?? 0
    const mb = rb?.migrations ?? 0
    return {
      mk,
      name: ra?.name ?? rb?.name ?? taskLabelForMergeKey(traceA || traceB, mk),
      migrationsA: ma,
      migrationsB: mb,
      delta: ma - mb,
      pingA: ra?.pingPong ?? 0,
      pingB: rb?.pingPong ?? 0,
    }
  })
}
