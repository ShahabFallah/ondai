import { useEffect, useMemo, useRef, useState } from 'react'
import { Image, Platform, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import type { RadiusKey } from '@ondai/tokens'
import { useMotion, useTheme } from '@ondai/tokens/react'

export interface ImageRevealProps {
  source: ImageSourcePropType
  width: number
  height: number
  radius?: RadiusKey | number
  /** `mosaic`: churning grey tiles resolve into the image. `ascii`: a mono glyph field on black does. */
  mode?: 'mosaic' | 'ascii'
  /** 0–1, or `auto` to loop: reveal 2.4 s, hold 1.6 s, dissolve 0.8 s. */
  progress?: number | 'auto'
  /** Grid cell size in px. */
  cell?: number
  /** Unrevealed cells occasionally pick up the accent colours. */
  tint?: boolean
  /** Fires once each time progress reaches 1. */
  onRevealed?: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
  accessibilityLabel?: string
}

const REVEAL_MS = 2400
const HOLD_MS = 1600
const DISSOLVE_MS = 800
const PERIOD_MS = REVEAL_MS + HOLD_MS + DISSOLVE_MS
/** Churn frame rate: one React state update per tick; every cell re-picks its colour from a time-based hash. */
const TICK_MS = 100
const FLASH_MS = 200
/** Peak opacity of the white flash on a cell that has just revealed: a glint, not a strobe. */
const FLASH_ALPHA = 0.16
/** Still frame for `auto` when motion is off. */
const STILL_PROGRESS = 0.55
const RAMP = ' .:-=+*#%@'
const NBSP = ' '
const TINT_CHANCE = 0.035

interface Cell {
  i: number
  col: number
  row: number
  x: number
  y: number
  /** Reveal order in [0,1): pseudo-random with a bias towards the centre. */
  order: number
  phase: number
  speed: number
  /** Which accent stop this cell borrows when tinted. */
  k: number
}

/** Deterministic hash of small integers → [0,1). */
function hash(a: number, b: number, c = 0): number {
  let h = (Math.imul(a + 1, 374761393) + Math.imul(b + 1, 668265263) + Math.imul(c + 1, 2246822519)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeInOut = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x))

function autoProgress(elapsed: number): number {
  const u = ((elapsed % PERIOD_MS) + PERIOD_MS) % PERIOD_MS
  if (u < REVEAL_MS) return easeInOut(u / REVEAL_MS)
  if (u < REVEAL_MS + HOLD_MS) return 1
  return 1 - easeInOut((u - REVEAL_MS - HOLD_MS) / DISSOLVE_MS)
}

function parseHex(c: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return null
  let h = m[1]!
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** `mix('#7CF7FF', '#1C2025', 0.3)`: 30% of the first colour over the second. Non-hex inputs fall back to the nearer one. */
function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  if (!pa || !pb) return t > 0.5 ? a : b
  const r = Math.round(pa[0] * t + pb[0] * (1 - t))
  const g = Math.round(pa[1] * t + pb[1] * (1 - t))
  const bl = Math.round(pa[2] * t + pb[2] * (1 - t))
  return `rgb(${r},${g},${bl})`
}

/** A cell's "luminance" this tick: a slow per-cell wave plus a little flicker, so the field breathes instead of strobing. */
function luminance(c: Cell, tick: number): number {
  const wave = 0.5 + 0.5 * Math.sin(c.phase + c.speed * tick)
  const flicker = hash(c.col, c.row, 1000 + tick)
  return 0.72 * wave + 0.28 * flicker
}

const isTinted = (c: Cell, tick: number, tint: boolean) => tint && hash(c.col, c.row, 5000 + (tick >> 2)) < TINT_CHANCE

/**
 * An image that resolves out of a churning mosaic or an ASCII field as `progress` rises.
 * The image sits underneath; an SVG overlay covers one rect per unrevealed grid cell.
 */
export function ImageReveal({ source, width, height, radius = 'lg', mode = 'mosaic', progress = 'auto', cell = 14, tint = true, onRevealed, style, testID, accessibilityLabel }: ImageRevealProps) {
  const t = useTheme()
  const motion = useMotion()
  const r = typeof radius === 'number' ? radius : t.radii[radius]
  const auto = progress === 'auto'

  const grid = useMemo(() => {
    const size = Math.max(4, cell)
    const cols = Math.max(1, Math.round(width / size))
    const rows = Math.max(1, Math.round(height / size))
    const cw = width / cols
    const ch = height / rows
    const cells: Cell[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const dx = (col + 0.5) / cols - 0.5
        const dy = (row + 0.5) / rows - 0.5
        const dist = Math.min(1, Math.hypot(dx, dy) / 0.7071)
        cells.push({
          i: row * cols + col,
          col,
          row,
          x: col * cw,
          y: row * ch,
          order: 0.72 * hash(col, row, 1) + 0.28 * dist,
          phase: hash(col, row, 2) * Math.PI * 2,
          speed: 0.25 + hash(col, row, 3) * 0.45,
          k: Math.floor(hash(col, row, 4) * 3),
        })
      }
    }
    const xs = Array.from({ length: cols }, (_, col) => col * cw + cw / 2)
    return { cols, rows, cw, ch, cells, xs }
  }, [width, height, cell])

  // One clock for everything: `t` ms since mount, `tick` counts churn frames.
  const [clock, setClock] = useState({ t: 0, tick: 0 })
  /** Wall-clock origin, taken when the timer first starts (never during render). */
  const mountAt = useRef(0)
  const loopStart = useRef(0)
  const tickRef = useRef(0)
  const tick = motion.enabled ? clock.tick : 0
  const p = auto ? (motion.enabled ? autoProgress(clock.t - loopStart.current) : STILL_PROGRESS) : clamp01(progress)

  // Flash bookkeeping: remember when each cell was revealed (only while motion is on, so still frames stay still).
  const revealedAt = useRef(new Map<number, number>())
  const wasOn = useRef<Uint8Array | null>(null)
  if (!wasOn.current || wasOn.current.length !== grid.cells.length) {
    wasOn.current = new Uint8Array(grid.cells.length)
    for (const c of grid.cells) wasOn.current[c.i] = c.order < p ? 1 : 0
    revealedAt.current.clear()
  }
  let flashing = false
  for (const c of grid.cells) {
    const on = c.order < p
    if (on && !wasOn.current[c.i] && motion.enabled) revealedAt.current.set(c.i, clock.t)
    else if (!on) revealedAt.current.delete(c.i)
    wasOn.current[c.i] = on ? 1 : 0
    if (on) {
      const at = revealedAt.current.get(c.i)
      if (at !== undefined && clock.t - at < FLASH_MS) flashing = true
    }
  }

  const live = motion.enabled && (auto || p < 1 || flashing)
  useEffect(() => {
    if (!live) return
    const base = Date.now()
    if (!mountAt.current) mountAt.current = base
    loopStart.current = base - mountAt.current
    const id = setInterval(() => {
      tickRef.current += 1
      setClock({ t: Date.now() - mountAt.current, tick: tickRef.current })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [live])

  const done = p >= 1
  const doneRef = useRef(false)
  useEffect(() => {
    if (done && !doneRef.current) {
      doneRef.current = true
      onRevealed?.()
    } else if (!done) doneRef.current = false
  }, [done, onRevealed])

  // A dim veil over the image that clears as the picture resolves (reanimated, so it stays smooth between ticks).
  const veil = useSharedValue(0)
  useEffect(() => {
    veil.value = withTiming(0.3 * (1 - p), { duration: motion.enabled ? 180 : 0 })
  }, [p, veil, motion.enabled])
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }), [veil])

  const palette = useMemo(() => {
    const g = t.colors.gray
    const greys = [g[1]!, g[2]!, g[3]!, g[4]!]
    const base = g[3]!
    const a = t.colors.accent
    return {
      greys,
      tints: [mix(a.a, base, 0.32), mix(a.b, base, 0.32), mix(a.c, base, 0.32)],
      glyphTints: [mix(a.a, t.colors.textSecondary, 0.55), mix(a.b, t.colors.textSecondary, 0.55), mix(a.c, t.colors.textSecondary, 0.55)],
    }
  }, [t])

  if (width <= 0 || height <= 0) return null

  const { cw, ch, cells, rows, cols, xs } = grid
  const w = cw + 0.5
  const h = ch + 0.5
  const flashFill = '#FFFFFF'
  const nodes: React.ReactNode[] = []

  if (mode === 'mosaic') {
    for (const c of cells) {
      if (c.order < p) continue
      const fill = isTinted(c, tick, tint) ? palette.tints[c.k]! : palette.greys[Math.min(3, Math.floor(luminance(c, tick) * 4))]!
      nodes.push(<Rect key={c.i} x={c.x} y={c.y} width={w} height={h} fill={fill} />)
    }
  } else {
    const fs = Math.min(cw, ch) * 0.84
    const mono = Platform.OS === 'web' ? t.fontFamilies.web.mono : t.fontFamilies.native.mono.regular
    for (let row = 0; row < rows; row++) {
      const y = row * ch + ch / 2 + fs * 0.36
      let dim = ''
      let bright = ''
      const tinted = ['', '', '']
      let hasBright = false
      const hasTint = [false, false, false]
      let runStart = -1
      for (let col = 0; col < cols; col++) {
        const c = cells[row * cols + col]!
        const on = c.order < p
        if (!on && runStart < 0) runStart = col
        if ((on || col === cols - 1) && runStart >= 0) {
          const end = on ? col : col + 1
          nodes.push(<Rect key={`b${row}-${runStart}`} x={runStart * cw} y={c.y} width={(end - runStart) * cw + 0.5} height={h} fill={t.colors.bg} />)
          runStart = -1
        }
        if (on) {
          dim += NBSP
          bright += NBSP
          for (let k = 0; k < 3; k++) tinted[k] += NBSP
          continue
        }
        const lum = luminance(c, tick)
        const glyph = RAMP[Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length))]!
        const ch1 = glyph === ' ' ? NBSP : glyph
        if (isTinted(c, tick, tint)) {
          dim += NBSP
          bright += NBSP
          for (let k = 0; k < 3; k++) tinted[k] += k === c.k ? ch1 : NBSP
          hasTint[c.k] = true
        } else if (lum > 0.82) {
          dim += NBSP
          bright += ch1
          for (let k = 0; k < 3; k++) tinted[k] += NBSP
          hasBright = true
        } else {
          dim += ch1
          bright += NBSP
          for (let k = 0; k < 3; k++) tinted[k] += NBSP
        }
      }
      nodes.push(
        <SvgText key={`t${row}`} x={xs} y={y} fill={t.colors.textTertiary} fontFamily={mono} fontSize={fs} textAnchor="middle">
          {dim}
        </SvgText>,
      )
      if (hasBright)
        nodes.push(
          <SvgText key={`tb${row}`} x={xs} y={y} fill={t.colors.textSecondary} fontFamily={mono} fontSize={fs} textAnchor="middle">
            {bright}
          </SvgText>,
        )
      for (let k = 0; k < 3; k++)
        if (hasTint[k])
          nodes.push(
            <SvgText key={`ta${row}-${k}`} x={xs} y={y} fill={palette.glyphTints[k]!} fontFamily={mono} fontSize={fs} textAnchor="middle">
              {tinted[k]}
            </SvgText>,
          )
    }
  }
  if (flashing) {
    for (const c of cells) {
      const at = revealedAt.current.get(c.i)
      if (at === undefined) continue
      const age = clock.t - at
      if (age < 0 || age >= FLASH_MS) continue
      nodes.push(<Rect key={`f${c.i}`} x={c.x} y={c.y} width={w} height={h} fill={flashFill} opacity={FLASH_ALPHA * (1 - age / FLASH_MS)} />)
    }
  }

  return (
    <View testID={testID} accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={[{ width, height, borderRadius: r, overflow: 'hidden', backgroundColor: t.colors.gray[1] }, style]}>
      <Image source={source} resizeMode="cover" style={{ width, height }} accessible={false} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bg }, veilStyle]} />
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={testID ? `${testID}-overlay` : undefined} style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height}>
          {nodes}
        </Svg>
      </View>
    </View>
  )
}

export default ImageReveal
