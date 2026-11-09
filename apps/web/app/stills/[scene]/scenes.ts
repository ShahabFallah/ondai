import type { CSSProperties } from 'react'

/** One real component, rendered by the playground embed at its natural width and placed in the scene. */
export interface Layer {
  name: string
  state?: string
  /** Extra playground query (props, t, ...). */
  query?: string
  /** The embed's width in CSS px; its height follows the content. */
  width: number
  x: number
  y: number
  scale: number
  /** Extra transform inside a 3D group (translateZ, rotate). */
  transform?: string
  /** Draw a connector from this card to the phone. */
  link?: 'left' | 'right'
  /** Centre the layer in the scene (x / y become offsets from the centre). */
  center?: boolean
}

export interface Group {
  /** Lay the layers out in normal flow (columns) instead of at x / y. */
  flow?: boolean
  style?: CSSProperties
  layers: Layer[]
}

export interface Scene {
  width: number
  height: number
  /** Generated photograph behind everything: `phone` (the hero still) or `wall` (a blurred crop of it). */
  photo: 'phone' | 'wall'
  /** The phone's screen in scene px, when the photograph's phone shows a component. */
  screen?: { x: number; y: number; w: number; h: number; radius: number; layer: Omit<Layer, 'x' | 'y' | 'scale'> }
  groups: Group[]
}

export const scenes: Record<string, Scene> = {
  'nav-ai': {
    width: 720,
    height: 540,
    photo: 'wall',
    groups: [
      {
        style: { position: 'absolute', left: 262, top: 228, width: 310, height: 300, transform: 'rotateX(54deg) rotateZ(-34deg)', transformStyle: 'preserve-3d' },
        layers: [
          { name: 'agent-run', state: 'confirm', width: 390, x: 0, y: 0, scale: 0.78, transform: 'translateZ(0px)' },
          { name: 'summarize', state: 'done', width: 380, x: -26, y: -26, scale: 0.8, transform: 'translateZ(120px)' },
          { name: 'smart-reply', state: 'done', width: 380, x: -52, y: -52, scale: 0.8, transform: 'translateZ(240px)' },
        ],
      },
    ],
  },

  'nav-core': {
    width: 720,
    height: 540,
    photo: 'wall',
    groups: [
      {
        style: { position: 'absolute', left: 240, top: 196, width: 300, height: 300, transform: 'rotateX(54deg) rotateZ(-34deg)', transformStyle: 'preserve-3d' },
        layers: [
          { name: 'sheet', state: 'open', width: 390, x: 0, y: 0, scale: 0.76, transform: 'translateZ(0px)' },
          { name: 'field', width: 360, x: -20, y: -20, scale: 0.8, transform: 'translateZ(130px)' },
          { name: 'model-download', state: 'preparing', width: 360, x: -40, y: -40, scale: 0.8, transform: 'translateZ(220px)' },
        ],
      },
    ],
  },

  'nav-all': {
    width: 720,
    height: 540,
    photo: 'wall',
    groups: [
      {
        flow: true,
        style: { position: 'absolute', left: 40, top: -40, width: 680, columnCount: 3, columnGap: 16, transform: 'perspective(1600px) rotateY(-18deg) rotateX(10deg) rotateZ(-3deg)', transformOrigin: '30% 40%' },
        layers: [
          { name: 'chat', state: 'done', width: 390, x: 0, y: 0, scale: 0.54 },
          { name: 'smart-reply', state: 'done', width: 380, x: 0, y: 0, scale: 0.55 },
          { name: 'summarize', state: 'done', width: 380, x: 0, y: 0, scale: 0.55 },
          { name: 'voice-memo', state: 'done', width: 390, x: 0, y: 0, scale: 0.54 },
          { name: 'agent-run', state: 'confirm', width: 390, x: 0, y: 0, scale: 0.54 },
          { name: 'model-download', state: 'preparing', width: 360, x: 0, y: 0, scale: 0.58 },
          { name: 'natural-filter', width: 380, x: 0, y: 0, scale: 0.55 },
        ],
      },
    ],
  },
}
