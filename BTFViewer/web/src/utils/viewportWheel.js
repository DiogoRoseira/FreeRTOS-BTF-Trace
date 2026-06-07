/** Shared timeline viewport mutations for wheel input (CPU load panel, etc.). */

export function clampPan(trace, newStart, newEnd) {
  const span = newEnd - newStart
  const lo = trace.timeMin >= 0 ? Math.max(0, trace.timeMin) : trace.timeMin
  const hi = trace.timeMax
  const range = hi - lo
  if (range <= 0) return { timeStart: lo, timeEnd: hi }
  if (span >= range) return { timeStart: lo, timeEnd: hi }
  if (newStart < lo) return { timeStart: lo, timeEnd: lo + span }
  if (newEnd > hi) return { timeStart: hi - span, timeEnd: hi }
  return { timeStart: newStart, timeEnd: newEnd }
}

export function applyZoomAroundPlotX(vp, trace, plotX, plotWidth, factor, minSpan = 1) {
  const { timeStart, timeEnd } = vp
  const span = timeEnd - timeStart
  const w = Math.max(1, plotWidth)
  const pivotT = timeStart + (plotX / w) * span

  let newSpan = span * factor
  const lo = trace.timeMin >= 0 ? Math.max(0, trace.timeMin) : trace.timeMin
  const maxSpan = Math.max(1, trace.timeMax - lo)
  newSpan = Math.min(newSpan, maxSpan)
  newSpan = Math.max(minSpan, newSpan)

  const newStart = pivotT - (plotX / w) * newSpan
  const { timeStart: s, timeEnd: e } = clampPan(trace, newStart, newStart + newSpan)
  return { ...vp, timeStart: s, timeEnd: e }
}

export function applyZoomAroundPlotY(vp, trace, plotY, plotHeight, headerH, factor, minSpan = 1) {
  const { timeStart, timeEnd } = vp
  const bodyH = Math.max(1, plotHeight - headerH)
  const span = timeEnd - timeStart
  const pivotT = timeStart + (Math.max(0, plotY - headerH) / bodyH) * span

  let newSpan = span * factor
  const lo = trace.timeMin >= 0 ? Math.max(0, trace.timeMin) : trace.timeMin
  const maxSpan = Math.max(1, trace.timeMax - lo)
  newSpan = Math.min(newSpan, maxSpan)
  newSpan = Math.max(minSpan, newSpan)

  const relPos = Math.max(0, plotY - headerH) / bodyH
  const newStart = pivotT - relPos * newSpan
  const { timeStart: s, timeEnd: e } = clampPan(trace, newStart, newStart + newSpan)
  return { ...vp, timeStart: s, timeEnd: e }
}

export function applyPanPlotX(vp, trace, deltaPx, plotWidth) {
  const span = vp.timeEnd - vp.timeStart
  const deltaNs = deltaPx * span / Math.max(1, plotWidth)
  const { timeStart: s, timeEnd: e } = clampPan(trace, vp.timeStart - deltaNs, vp.timeEnd - deltaNs)
  return { ...vp, timeStart: s, timeEnd: e }
}

export function applyPanPlotY(vp, trace, deltaPx, plotHeight, headerH) {
  const bodyH = Math.max(1, plotHeight - headerH)
  const span = vp.timeEnd - vp.timeStart
  const deltaNs = deltaPx * span / bodyH
  const { timeStart: s, timeEnd: e } = clampPan(trace, vp.timeStart + deltaNs, vp.timeEnd + deltaNs)
  return { ...vp, timeStart: s, timeEnd: e }
}
