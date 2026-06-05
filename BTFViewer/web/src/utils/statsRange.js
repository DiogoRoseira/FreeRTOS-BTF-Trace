/**
 * Cursor-scoped statistics helpers (parity with desktop btf_viewer.py).
 */

/** @returns {number[]} Non-null cursor timestamps. */
export function getPlacedCursors(cursors) {
  return (cursors || []).filter(c => c !== null)
}

/** Nanoseconds of segment inside [lo, hi). */
export function segOverlapNs(seg, lo, hi) {
  if (seg.end <= lo || seg.start >= hi) return 0
  return Math.min(seg.end, hi) - Math.max(seg.start, lo)
}

/** Segment starts and ends inside [lo, hi] (inclusive). */
export function segFullyInRange(seg, lo, hi) {
  return seg.start >= lo && seg.end <= hi
}

export function segOverlapsRange(seg, lo, hi) {
  return seg.end > lo && seg.start < hi
}

/**
 * Active cursor range for statistics when scope is enabled.
 * @returns {{ lo: number, hi: number, nCursors: number } | null}
 */
export function getStatsRange(cursors, scopeEnabled) {
  if (!scopeEnabled) return null
  const placed = getPlacedCursors(cursors)
  if (placed.length < 2) return null
  const sorted = [...placed].sort((a, b) => a - b)
  const lo = sorted[0]
  const hi = sorted[sorted.length - 1]
  if (hi <= lo) return null
  return { lo, hi, nCursors: placed.length }
}

export function scopeSuffix(range) {
  return range ? ' (cursor range)' : ''
}
