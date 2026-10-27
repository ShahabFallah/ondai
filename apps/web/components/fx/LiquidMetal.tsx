'use client'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useVisible } from './useVisible'

/**
 * LiquidMetal: a mercury / polished-chrome surface rendered by one WebGL2 fragment shader.
 *
 * A slowly evolving height field (domain-warped FBM, four octaves) tilts the normal of a base shape
 * (sphere, torus-section ring or bevelled pill). The normal reflects a procedural studio environment
 * (dark floor, bright horizon band, cool top light, faint ion-coloured bands near the horizon) so the
 * brand colours only ever appear as reflections, never as a tint. Fresnel rim + one sharp wandering
 * specular. The pointer dents the surface with a gaussian falloff and springs back.
 *
 * The rAF loop stops offscreen, in hidden tabs, when `paused` and under reduced motion (one still
 * frame). Context loss is handled; without WebGL2 a Canvas 2D still that still reads as metal is drawn.
 * Nothing re-renders React per frame: the loop reads props through a ref.
 */

export type LiquidMetalShape = 'orb' | 'ring' | 'pill'

export interface LiquidMetalProps {
  /** `orb` (default): a sphere. `ring`: an annulus with a rounded cross-section. `pill`: a rounded slab with a bevelled edge. */
  shape?: LiquidMetalShape
  /** CSS px for orb and ring (default 160). */
  size?: number
  /** Pill only: CSS width / height in px (default 220 × 64). */
  width?: number
  height?: number
  /** 0–1: scales surface turbulence and reflection sharpness (default 0.7). */
  strength?: number
  /** The three colours the chrome picks up as reflections near the horizon. Default: the ion stops. */
  colors?: [string, string, string]
  /** The pointer dents the surface with a smooth falloff and a spring return (default true). */
  interactive?: boolean
  /** Stop the loop; the last frame stays. */
  paused?: boolean
  /** Accessible name. Without it (and without children) the visual is `aria-hidden`. */
  label?: string
  className?: string
  style?: CSSProperties
  /** Pill: content rendered centred on top of the metal, e.g. a button label. */
  children?: ReactNode
}

const ION: [string, string, string] = ['#7CF7FF', '#8B7CFF', '#FF7CE5']
const SHAPE_INDEX: Record<LiquidMetalShape, number> = { orb: 0, ring: 1, pill: 2 }
const MAX_DPR = 2

type Rgb = [number, number, number]

interface Live {
  shape: number
  strength: number
  colors: [Rgb, Rgb, Rgb]
}

interface Renderer {
  start(): void
  stop(): void
  /** Draw one frame now if the loop is not running. */
  still(): void
  pointer(x: number, y: number, inside: boolean): void
  destroy(): void
}

/* ------------------------------------------------------------------ */
/* Shaders                                                              */
/* ------------------------------------------------------------------ */

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeed;
uniform vec3 uPointer;
uniform float uStrength;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform int uShape;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = ROT * p;
    a *= 0.42;
  }
  return s;
}
// Domain-warped FBM. The warp drifts with time, so the surface keeps flowing instead of scrolling.
float field(vec2 p) {
  float t = uTime * 0.7;
  vec2 q = vec2(fbm(p + vec2(0.0, 0.30 * t)), fbm(p + vec2(5.2, 1.3) + vec2(-0.22 * t, 0.12 * t)));
  return fbm(p + 1.2 * q + vec2(0.08 * t, -0.04 * t));
}
float height(vec2 p) {
  // A pill is wide in shape space: coarser noise keeps its ripples as large as the orb's.
  float scale = uShape == 2 ? 0.55 : 0.85;
  float h = field(p * scale + uSeed) - 0.45;
  vec2 d = p - uPointer.xy;
  h -= uPointer.z * 0.9 * exp(-dot(d, d) * 9.0);
  return h;
}
float sdPill(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
// Signed distance to the silhouette (negative inside) and the smooth base normal.
void geometry(vec2 p, out float d, out vec3 n) {
  if (uShape == 0) {
    float R = 0.92;
    float r = length(p);
    d = r - R;
    float k = min(r / R, 1.0);
    vec2 g = r > 1e-5 ? p / r : vec2(0.0);
    n = vec3(g * k, sqrt(max(1.0 - k * k, 0.0)));
  } else if (uShape == 1) {
    float Rc = 0.62;
    float w = 0.30;
    float r = length(p);
    float t = (r - Rc) / w;
    d = abs(r - Rc) - w;
    float k = min(abs(t), 1.0);
    vec2 g = (r > 1e-5 ? p / r : vec2(0.0)) * sign(t);
    n = vec3(g * k, sqrt(max(1.0 - k * k, 0.0)));
  } else {
    float aspect = uRes.x / uRes.y;
    float m = 0.06;
    vec2 b = vec2(aspect, 1.0) - m;
    float r = 1.0 - m;
    d = sdPill(p, b, r);
    float e = 0.01;
    vec2 g = vec2(
      sdPill(p + vec2(e, 0.0), b, r) - sdPill(p - vec2(e, 0.0), b, r),
      sdPill(p + vec2(0.0, e), b, r) - sdPill(p - vec2(0.0, e), b, r)
    );
    g = normalize(g + vec2(1e-6, 0.0));
    float bw = 0.55;
    float k = 1.0 - clamp(-d / bw, 0.0, 1.0);
    n = normalize(vec3(g * k, sqrt(max(1.0 - k * k, 0.0))) + vec3(0.0, -p.y * 0.10, 0.0));
  }
}
// The studio the chrome reflects: a dark floor, a bright horizon, a cool dim sky, one soft top light,
// and the three ion colours as thin bands near the horizon (modulated around the azimuth so they read
// as reflections of coloured lights rather than stripes).
vec3 env(vec3 r, float rough) {
  // The horizon sits a little below the reflection's equator, so a flat face reflects the bright band.
  float y = r.y + 0.10;
  float soft = mix(0.03, 0.12, rough);
  vec3 sky = mix(vec3(0.88, 0.90, 0.93), vec3(0.20, 0.21, 0.25), smoothstep(0.0, 0.7, y));
  vec3 flo = mix(vec3(0.02, 0.02, 0.025), vec3(0.34, 0.34, 0.37), pow(smoothstep(-1.0, 0.0, y), 2.0));
  // A pill carries a label: lift its floor so the dark patches stay readable.
  if (uShape == 2) flo = mix(flo, vec3(0.55, 0.56, 0.58), 0.3);
  vec3 c = mix(flo, sky, smoothstep(-soft, soft, y));
  c += vec3(1.0) * exp(-y * y / (0.003 + rough * 0.03)) * 0.85;
  float az = atan(r.x, r.z);
  float ma = 0.5 + 0.5 * cos(az + uTime * 0.17);
  float mb = 0.5 + 0.5 * cos(az + 2.2 - uTime * 0.13);
  float mc = 0.5 + 0.5 * cos(az * 2.0 + 4.1 + uTime * 0.10);
  float wa = 0.07 + rough * 0.08;
  c += uColA * exp(-pow((y - 0.20) / wa, 2.0)) * 0.7 * ma;
  c += uColB * exp(-pow((y + 0.14) / wa, 2.0)) * 0.6 * mb;
  c += uColC * exp(-pow((y - 0.42) / (wa * 1.4), 2.0)) * 0.5 * mc;
  float top = pow(max(dot(r, normalize(vec3(-0.35, 0.85, 0.40))), 0.0), mix(40.0, 14.0, rough));
  c += vec3(0.92, 0.95, 1.0) * top * 1.1;
  return c;
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * min(uRes.x, uRes.y));
  float d;
  vec3 n;
  geometry(p, d, n);
  float px = 2.0 / min(uRes.x, uRes.y);
  float a = 1.0 - smoothstep(-px, px * 0.5, d);
  if (a <= 0.001) {
    o = vec4(0.0);
    return;
  }

  // Liquid surface: tilt the base normal by the gradient of the height field (and the pointer dent).
  float e = 0.02;
  float h0 = height(p);
  vec2 grad = vec2(height(p + vec2(e, 0.0)) - h0, height(p + vec2(0.0, e)) - h0) / e;
  float amp = mix(0.4, 1.6, uStrength);
  float edge = smoothstep(0.0, 0.2, -d);
  n = normalize(n + vec3(-grad * amp * (0.3 + 0.7 * edge), 0.0));

  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 R = reflect(-V, n);
  float rough = (1.0 - uStrength) * 0.7;
  vec3 col = env(R, rough);
  float fr = pow(1.0 - clamp(n.z, 0.0, 1.0), 4.0);
  col += vec3(0.30, 0.32, 0.36) * fr;
  vec3 L = normalize(vec3(0.6 * cos(uTime * 0.31 + uSeed), 0.7 + 0.25 * sin(uTime * 0.23 + uSeed), 0.55));
  vec3 H = normalize(L + V);
  float sp = pow(max(dot(n, H), 0.0), mix(40.0, 260.0, uStrength));
  col += vec3(1.0) * sp * 1.1;
  col = aces(col);
  o = vec4(col * a, a);
}
`

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** `#rgb` / `#rrggbb` → [r, g, b] in 0–1. Anything else becomes mid grey. */
function toRgb(color: string): Rgb {
  let hx = color.trim().replace(/^#/, '')
  if (hx.length === 3 || hx.length === 4) hx = hx.slice(0, 3).split('').map((c) => c + c).join('')
  const n = parseInt(hx.slice(0, 6), 16)
  if (hx.length < 6 || Number.isNaN(n)) return [0.6, 0.63, 0.66]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const dpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR)

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== 'production') console.error('[LiquidMetal] shader', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

/* ------------------------------------------------------------------ */
/* WebGL2 renderer                                                      */
/* ------------------------------------------------------------------ */

const UNIFORMS = ['uRes', 'uTime', 'uSeed', 'uPointer', 'uStrength', 'uColA', 'uColB', 'uColC', 'uShape'] as const
type UniformName = (typeof UNIFORMS)[number]

function createGlRenderer(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, live: () => Live): Renderer | null {
  const seed = Math.random() * 100
  let program: WebGLProgram | null = null
  let loc: Partial<Record<UniformName, WebGLUniformLocation | null>> = {}
  let raf = 0
  let lost = false
  let wantRun = false
  let time = Math.random() * 60
  let last = 0
  // Pointer: the position follows quickly, the dent amount is a spring (its overshoot on release is the rebound).
  let px = 0
  let py = 0
  let tx = 0
  let ty = 0
  let amt = 0
  let vel = 0
  let target = 0

  const build = (): boolean => {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return false
    const prog = gl.createProgram()
    if (!prog) return false
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      if (process.env.NODE_ENV !== 'production') console.error('[LiquidMetal] link', gl.getProgramInfoLog(prog))
      gl.deleteProgram(prog)
      return false
    }
    program = prog
    loc = {}
    for (const name of UNIFORMS) loc[name] = gl.getUniformLocation(prog, name)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
    gl.clearColor(0, 0, 0, 0)
    return true
  }

  const resize = (): boolean => {
    const w = Math.round(canvas.clientWidth * dpr())
    const h = Math.round(canvas.clientHeight * dpr())
    if (w === canvas.width && h === canvas.height) return false
    canvas.width = w
    canvas.height = h
    return true
  }

  const render = () => {
    if (!program || lost) return
    const w = canvas.width
    const h = canvas.height
    if (w === 0 || h === 0) return
    const l = live()
    gl.viewport(0, 0, w, h)
    gl.useProgram(program)
    gl.uniform2f(loc.uRes ?? null, w, h)
    gl.uniform1f(loc.uTime ?? null, time)
    gl.uniform1f(loc.uSeed ?? null, seed)
    gl.uniform3f(loc.uPointer ?? null, px, py, amt)
    gl.uniform1f(loc.uStrength ?? null, l.strength)
    gl.uniform3f(loc.uColA ?? null, l.colors[0][0], l.colors[0][1], l.colors[0][2])
    gl.uniform3f(loc.uColB ?? null, l.colors[1][0], l.colors[1][1], l.colors[1][2])
    gl.uniform3f(loc.uColC ?? null, l.colors[2][0], l.colors[2][1], l.colors[2][2])
    gl.uniform1i(loc.uShape ?? null, l.shape)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const frame = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    time = (time + dt) % 3600
    const k = 1 - Math.exp(-dt * 16)
    px += (tx - px) * k
    py += (ty - py) * k
    vel += (target - amt) * 140 * dt
    vel *= Math.exp(-dt * 11)
    amt += vel * dt
    render()
    raf = requestAnimationFrame(frame)
  }

  const start = () => {
    wantRun = true
    if (raf || lost || !program) return
    last = 0
    raf = requestAnimationFrame(frame)
    canvas.dataset.running = 'true'
  }
  const stop = () => {
    wantRun = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    canvas.dataset.running = 'false'
  }

  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    const resume = wantRun
    stop()
    wantRun = resume
    program = null
    canvas.dataset.running = 'false'
  }
  const onRestored = () => {
    lost = false
    if (!build()) return
    resize()
    if (wantRun) start()
    else render()
  }

  if (!build()) return null

  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
    if (resize() && !raf) render()
  }) : null
  ro?.observe(canvas)
  resize()
  render()

  return {
    start,
    stop,
    still() {
      if (!raf) {
        resize()
        render()
      }
    },
    pointer(x, y, inside) {
      if (inside) {
        tx = x
        ty = y
        target = 1
      } else {
        target = 0
      }
    },
    destroy() {
      stop()
      ro?.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (program) gl.deleteProgram(program)
      program = null
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

/* ------------------------------------------------------------------ */
/* Canvas 2D fallback: a still that still reads as metal                */
/* ------------------------------------------------------------------ */

const rgba = (c: Rgb, a: number) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`

function createFallbackRenderer(canvas: HTMLCanvasElement, live: () => Live): Renderer {
  const ctx = canvas.getContext('2d')
  const draw = () => {
    if (!ctx) return
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (!cw || !ch) return
    const r = dpr()
    canvas.width = Math.round(cw * r)
    canvas.height = Math.round(ch * r)
    ctx.setTransform(r, 0, 0, r, 0, 0)
    ctx.clearRect(0, 0, cw, ch)
    const l = live()
    const cx = cw / 2
    const cy = ch / 2
    const s = Math.min(cw, ch) / 2
    const path = new Path2D()
    if (l.shape === 0) path.arc(cx, cy, s * 0.92, 0, Math.PI * 2)
    else if (l.shape === 1) {
      path.arc(cx, cy, s * 0.92, 0, Math.PI * 2)
      path.arc(cx, cy, s * 0.32, 0, Math.PI * 2, true)
    } else path.roundRect(s * 0.06, s * 0.06, cw - s * 0.12, ch - s * 0.12, s * 0.94)
    ctx.save()
    ctx.clip(path, 'evenodd')
    const base = ctx.createLinearGradient(0, cy - s, 0, cy + s)
    base.addColorStop(0, '#30343a')
    base.addColorStop(0.4, '#c9ccd2')
    base.addColorStop(0.48, '#f2f3f5')
    base.addColorStop(0.52, '#2d3036')
    base.addColorStop(0.8, '#101214')
    base.addColorStop(1, '#2a2d33')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, cw, ch)
    const band = (c: Rgb, y: number, hgt: number, alpha: number) => {
      const g = ctx.createLinearGradient(0, y - hgt, 0, y + hgt)
      g.addColorStop(0, rgba(c, 0))
      g.addColorStop(0.5, rgba(c, alpha))
      g.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, y - hgt, cw, hgt * 2)
    }
    band(l.colors[0], cy - s * 0.2, s * 0.1, 0.22)
    band(l.colors[1], cy + s * 0.14, s * 0.1, 0.2)
    band(l.colors[2], cy - s * 0.38, s * 0.1, 0.14)
    const hl = ctx.createRadialGradient(cx - s * 0.35, cy - s * 0.55, 0, cx - s * 0.35, cy - s * 0.55, s * 0.9)
    hl.addColorStop(0, 'rgba(255,255,255,0.9)')
    hl.addColorStop(0.25, 'rgba(255,255,255,0.35)')
    hl.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hl
    ctx.fillRect(0, 0, cw, ch)
    if (l.shape !== 2) {
      const rim = ctx.createRadialGradient(cx, cy, s * 0.6, cx, cy, s * 0.95)
      rim.addColorStop(0, 'rgba(0,0,0,0)')
      rim.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.fillStyle = rim
      ctx.fillRect(0, 0, cw, ch)
    }
    ctx.restore()
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null
  ro?.observe(canvas)
  draw()
  canvas.dataset.running = 'false'
  return {
    start() {},
    stop() {},
    still: draw,
    pointer() {},
    destroy() {
      ro?.disconnect()
    },
  }
}

type Mode = 'gl' | '2d'

/**
 * WebGL2 when it works, Canvas 2D when there is no WebGL2. `lost` means the canvas handed back a
 * context that is already lost (we lose it on purpose at cleanup and React StrictMode remounts on the
 * same element): the caller mounts a fresh canvas. `failed` means the program would not build.
 */
function createRenderer(canvas: HTMLCanvasElement, live: () => Live, mode: Mode): Renderer | 'lost' | 'failed' {
  if (mode === '2d') return createFallbackRenderer(canvas, live)
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) return createFallbackRenderer(canvas, live)
  if (gl.isContextLost()) return 'lost'
  const r = createGlRenderer(canvas, gl, live)
  if (r) return r
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return 'failed'
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function LiquidMetal({
  shape = 'orb',
  size = 160,
  width,
  height,
  strength = 0.7,
  colors = ION,
  interactive = true,
  paused = false,
  label,
  className = '',
  style,
  children,
}: LiquidMetalProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const { visible, reduced } = useVisible(wrapRef)

  const [ca, cb, cc] = colors
  const live = useMemo<Live>(
    () => ({ shape: SHAPE_INDEX[shape], strength: clamp01(strength), colors: [toRgb(ca), toRgb(cb), toRgb(cc)] }),
    [shape, strength, ca, cb, cc],
  )
  const liveRef = useRef(live)
  liveRef.current = live
  const run = visible && !paused && !reduced
  const runRef = useRef(run)
  runRef.current = run

  // The canvas is keyed: a fresh element is mounted when a context comes back lost, or in 2D mode
  // when WebGL2 exists but the program will not build. At most a couple of extra renders, once.
  const [mount, setMount] = useState<{ key: number; mode: Mode }>({ key: 0, mode: 'gl' })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const r = createRenderer(canvas, () => liveRef.current, mount.mode)
    if (r === 'lost' || r === 'failed') {
      setMount((m) => ({ key: m.key + 1, mode: r === 'failed' || m.key >= 2 ? '2d' : 'gl' }))
      return
    }
    rendererRef.current = r
    if (runRef.current) r.start()
    else r.still()
    return () => {
      r.destroy()
      rendererRef.current = null
    }
  }, [mount])

  // A prop changed while the loop is stopped (paused / reduced motion / offscreen): refresh the still frame.
  useEffect(() => {
    rendererRef.current?.still()
  }, [live])

  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    if (run) r.start()
    else {
      r.stop()
      r.still()
    }
  }, [run])

  const isPill = shape === 'pill'
  const w = isPill ? (width ?? 220) : size
  const h = isPill ? (height ?? 64) : size

  const onMove = interactive
    ? (e: ReactPointerEvent<HTMLDivElement>) => {
        const r = rendererRef.current
        const el = wrapRef.current
        if (!r || !el) return
        const rect = el.getBoundingClientRect()
        const half = Math.min(rect.width, rect.height) / 2 || 1
        r.pointer((e.clientX - rect.left - rect.width / 2) / half, -(e.clientY - rect.top - rect.height / 2) / half, true)
      }
    : undefined
  const onLeave = interactive ? () => rendererRef.current?.pointer(0, 0, false) : undefined

  const decorative = !label && children == null

  return (
    <div
      ref={wrapRef}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={decorative || undefined}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      style={{
        position: 'relative',
        display: 'inline-block',
        verticalAlign: 'middle',
        flex: 'none',
        width: w,
        height: h,
        touchAction: interactive ? 'pan-y' : undefined,
        ...style,
      }}
    >
      <canvas
        key={mount.key}
        ref={canvasRef}
        aria-hidden
        data-running="false"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      {children != null && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
