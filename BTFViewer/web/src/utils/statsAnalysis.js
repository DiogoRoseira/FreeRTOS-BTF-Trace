/**
 * RTOS scheduling analysis helpers (parity with desktop btf_viewer.py).
 */

import { segFullyInRange } from './statsRange.js'

/** @returns {{ prev: object|null, next: object|null, index: number, total: number }} */
export function segCoreNeighbors(trace, seg) {
  const segs = trace.coreSegs?.get(seg.core) || []
  const n = segs.length
  if (!n) return { prev: null, next: null, index: 0, total: 0 }
  let idx = -1
  for (let i = 0; i < n; i++) {
    const s = segs[i]
    if (s.start === seg.start && s.end === seg.end && s.task === seg.task) {
      idx = i
      break
    }
  }
  if (idx < 0) return { prev: null, next: null, index: 0, total: n }
  return {
    prev: idx > 0 ? segs[idx - 1] : null,
    next: idx + 1 < n ? segs[idx + 1] : null,
    index: idx + 1,
    total: n,
  }
}

/** Off-CPU gaps between consecutive slices of the same task. */
export function blockingTimeSamples(segs, lo, hi) {
  if (!segs || segs.length < 2) return []
  const ordered = [...segs].sort((a, b) => a.start - b.start)
  const samples = []
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]
    const nxt = ordered[i]
    if (lo != null && hi != null) {
      if (!segFullyInRange(prev, lo, hi) || !segFullyInRange(nxt, lo, hi)) continue
    }
    const gap = nxt.start - prev.end
    if (gap > 0) samples.push(gap)
  }
  return samples
}

/** Plot points for blocking-time distribution (x = resume time, y = gap ns). */
export function blockingTimePlotPoints(segs, lo, hi) {
  if (!segs || segs.length < 2) return []
  const ordered = [...segs].sort((a, b) => a.start - b.start)
  const points = []
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]
    const nxt = ordered[i]
    if (lo != null && hi != null) {
      if (!segFullyInRange(prev, lo, hi) || !segFullyInRange(nxt, lo, hi)) continue
    }
    const gap = nxt.start - prev.end
    if (gap > 0) {
      points.push({ xNs: nxt.start, yValue: gap, payload: nxt, prev })
    }
  }
  return points
}

/** Context-switch count and inter-slice core gaps within optional scope. */
export function schedulingStats(trace, lo, hi) {
  const ctxSwitches = { value: 0 }
  const gaps = []
  const cores = trace.coreNames || []
  for (const core of cores) {
    const segs = trace.coreSegs?.get(core) || []
    for (let i = 1; i < segs.length; i++) {
      const prev = segs[i - 1]
      const curr = segs[i]
      if (lo != null && hi != null && !(curr.start >= lo && curr.start <= hi)) continue
      ctxSwitches.value += 1
      const gap = curr.start - prev.end
      gaps.push(gap > 0 ? gap : 0)
    }
  }
  return { contextSwitches: ctxSwitches.value, coreGaps: gaps }
}

/** Longest-duration slice in segs (respecting cursor scope). */
export function findWcetSegment(segs, lo, hi) {
  let best = null
  let bestD = 0
  for (const s of segs || []) {
    const d = s.end - s.start
    if (d <= 0) continue
    if (lo != null && hi != null && !segFullyInRange(s, lo, hi)) continue
    if (d > bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

/** Shortest-duration slice in segs (respecting cursor scope). */
export function findBcetSegment(segs, lo, hi) {
  let best = null
  let bestD = null
  for (const s of segs || []) {
    const d = s.end - s.start
    if (d <= 0) continue
    if (lo != null && hi != null && !segFullyInRange(s, lo, hi)) continue
    if (bestD == null || d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

/** Resume slice for min/max off-CPU gap between activations. */
export function findExtremeBlockingSegment(segs, lo, hi, findMax = true) {
  if (!segs || segs.length < 2) return null
  const ordered = [...segs].sort((a, b) => a.start - b.start)
  let bestSeg = null
  let bestGap = null
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]
    const nxt = ordered[i]
    if (lo != null && hi != null) {
      if (!segFullyInRange(prev, lo, hi) || !segFullyInRange(nxt, lo, hi)) continue
    }
    const gap = nxt.start - prev.end
    if (gap <= 0) continue
    if (bestGap == null || (findMax ? gap > bestGap : gap < bestGap)) {
      bestGap = gap
      bestSeg = nxt
    }
  }
  return bestSeg
}

/** Activation slice for min/max inter-arrival gap. */
export function findExtremeInterArrivalSegment(segs, lo, hi, findMax = true) {
  if (!segs || segs.length < 2) return null
  const ordered = [...segs].sort((a, b) => a.start - b.start)
  let bestSeg = null
  let bestGap = null
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]
    const nxt = ordered[i]
    const gap = nxt.start - prev.start
    if (gap <= 0) continue
    if (lo != null && hi != null && (nxt.start < lo || nxt.start > hi)) continue
    if (bestGap == null || (findMax ? gap > bestGap : gap < bestGap)) {
      bestGap = gap
      bestSeg = nxt
    }
  }
  return bestSeg
}

/** Build multi-line tooltip text for a segment hover. */
export function segmentTooltipLines(trace, seg, formatTimeFn, taskDisplayNameFn) {
  if (!seg) return []
  const scale = trace?.timeScale || 'ns'
  const dur = seg.end - seg.start
  const lines = [
    { key: 'Task', val: seg.task, bold: true },
    { key: 'Core', val: seg.core },
    { key: 'Start', val: formatTimeFn(seg.start, scale) },
    { key: 'End', val: formatTimeFn(seg.end, scale) },
    { key: 'Duration', val: formatTimeFn(dur, scale) },
  ]
  if (trace) {
    const { prev, next, index, total } = segCoreNeighbors(trace, seg)
    if (index > 0) lines.push({ key: 'Slice', val: `#${index}/${total} on ${seg.core}` })
    if (prev) {
      lines.push({
        key: '← Prev',
        val: `${taskDisplayNameFn(prev.task)} (${formatTimeFn(prev.end, scale)})`,
      })
    }
    if (next) {
      lines.push({
        key: '→ Next',
        val: `${taskDisplayNameFn(next.task)} (${formatTimeFn(next.start, scale)})`,
      })
    }
    if (prev) {
      const gap = seg.start - prev.end
      if (gap > 0) lines.push({ key: 'Gap before', val: formatTimeFn(gap, scale) })
    }
  }
  return lines
}
