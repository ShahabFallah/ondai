'use client'
import { useEffect, useRef } from 'react'
import './ambient.css'

/**
 * The page's ground: light falling through blinds. Two sets of soft diagonal slats drift past each other
 * very slowly, a broad patch of window light wanders across the top left, and the edges fall off a touch.
 *
 * Drawn by one small fragment shader so it stays smooth on near-black: every pixel gets a fixed dither
 * (no temporal flicker), which removes the 8-bit banding a CSS gradient shows in dark mode. It renders at
 * CSS-pixel resolution, at most 30 frames a second, only while the tab is visible; under reduced motion it
 * draws one frame. Without WebGL the plain `--bg` fill stays.
 */

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBase;
uniform float uLit;
uniform float uShade;
uniform float uVig;
uniform float uGrain;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// One family of soft slats: 1 in the light, 0 in the shadow, with long eased edges.
float slats(vec2 uv, float ang, float period, float phase, float soft) {
  float x = dot(uv, vec2(cos(ang), sin(ang))) / period + phase;
  float f = fract(x);
  return smoothstep(0.0, soft, f) * (1.0 - smoothstep(0.5, 0.5 + soft, f));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = frag / uRes;
  p.y = 1.0 - p.y;
  vec2 uv = vec2(frag.x, uRes.y - frag.y) / uRes.y;
  float t = uTime;

  // A slow, wide warp so the light bends like it passes a moving curtain.
  uv += 0.035 * vec2(sin(uv.y * 1.6 + t * 0.045), cos(uv.x * 1.2 - t * 0.035));

  float a = slats(uv, radians(35.0), 0.36, t * 0.018, 0.2);
  float b = slats(uv, radians(31.0), 0.57, -t * 0.011 + 0.3, 0.24);
  float light = a * 0.62 + b * 0.38;

  vec2 sc = p - vec2(0.2 + 0.08 * sin(t * 0.021), 0.06 + 0.04 * cos(t * 0.017));
  float sun = exp(-dot(sc * vec2(1.0, 1.5), sc * vec2(1.0, 1.5)) * 2.6);

  float lit = light * (0.45 + 0.55 * sun);
  vec3 col = uBase + uLit * lit - uShade * (1.0 - light) * (0.5 + 0.5 * (1.0 - sun));

  float vig = smoothstep(1.2, 0.3, length((p - vec2(0.5, 0.42)) * vec2(1.0, 1.25)));
  col *= mix(1.0 - uVig, 1.0, vig);

  // Fixed per-pixel dither and fine grain: no banding, no shimmer.
  col += (hash(frag) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`

interface Look {
  base: [number, number, number]
  lit: number
  shade: number
  vig: number
  grain: number
}
const LIGHT: Look = { base: [0.955, 0.955, 0.96], lit: 0.045, shade: 0.06, vig: 0.05, grain: 0.022 }
const DARK: Look = { base: [0.033, 0.033, 0.039], lit: 0.042, shade: 0.016, vig: 0.42, grain: 0.014 }

export function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power', preserveDrawingBuffer: false })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const u = (n: string) => gl.getUniformLocation(prog, n)
    const uRes = u('uRes')
    const uTime = u('uTime')
    const uBase = u('uBase')
    const uLit = u('uLit')
    const uShade = u('uShade')
    const uVig = u('uVig')
    const uGrain = u('uGrain')

    const root = document.documentElement
    const applyLook = () => {
      const l = root.classList.contains('dark') ? DARK : LIGHT
      gl.uniform3f(uBase, ...l.base)
      gl.uniform1f(uLit, l.lit)
      gl.uniform1f(uShade, l.shade)
      gl.uniform1f(uVig, l.vig)
      gl.uniform1f(uGrain, l.grain)
    }

    const resize = () => {
      const w = Math.max(1, Math.round(window.innerWidth))
      const h = Math.max(1, Math.round(window.innerHeight))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uRes, w, h)
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const start = performance.now() - 40_000 // start mid-drift so the first frame is already composed
    let raf = 0
    let last = 0
    const draw = (now: number) => {
      gl.uniform1f(uTime, reduced.matches ? 40 : (now - start) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 1000 / 30) return
      last = now
      draw(now)
    }
    const run = () => {
      cancelAnimationFrame(raf)
      if (reduced.matches || document.hidden) draw(performance.now())
      else raf = requestAnimationFrame(loop)
    }

    applyLook()
    resize()
    draw(performance.now())
    canvas.dataset.on = 'true'
    run()

    const themeObserver = new MutationObserver(() => {
      applyLook()
      draw(performance.now())
    })
    themeObserver.observe(root, { attributes: true, attributeFilter: ['class'] })
    const onResize = () => {
      resize()
      draw(performance.now())
    }
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', run)
    reduced.addEventListener('change', run)

    return () => {
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', run)
      reduced.removeEventListener('change', run)
    }
  }, [])

  return (
    <div aria-hidden className="ambient">
      <canvas ref={ref} className="ambient-canvas" />
    </div>
  )
}
