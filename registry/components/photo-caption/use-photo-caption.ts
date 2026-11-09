import { useCallback, useRef, useState } from 'react'
import { estimateTokens, streamText, useTask, type TaskController } from '@ondai/core'
import { captionInstructions, captionPrompt, parseCaption, type CaptionTone } from './prompts'

export interface CaptionImage {
  uri: string
  /** Base64 without the `data:` prefix (expo-image-picker with `base64: true`). Preferred over `uri` when set. */
  base64?: string
  /** e.g. `image/jpeg`. Guessed from the data URI, else JPEG. */
  mimeType?: string
  width?: number
  height?: number
}

export interface UsePhotoCaptionOptions {
  tone?: CaptionTone
  /** Added to the system instructions (house style, language). */
  instructions?: string
  localOnly?: boolean
  component?: string
  onDone?: (result: { caption: string; alt: string }) => void
}

export interface PhotoCaptionState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  caption: string
  alt: string
  /** Which output is streaming right now. */
  writing: 'caption' | 'alt' | null
  isBusy: boolean
  /** Describe a photo: streams the caption, then the alt text. */
  run: (image: CaptionImage) => Promise<{ caption: string; alt: string }>
  /** Edit either output by hand (after the model is done). */
  setCaption: (text: string) => void
  setAlt: (text: string) => void
}

/** The image as an AI SDK image part: base64 when we have it, a data URI split into bytes and type, else the URL. */
export function imagePart(image: CaptionImage): { type: 'image'; image: string | URL; mediaType?: string } {
  if (image.base64) return { type: 'image', image: image.base64, mediaType: image.mimeType ?? 'image/jpeg' }
  const m = image.uri.match(/^data:([^;,]+);base64,(.*)$/)
  if (m) return { type: 'image', image: m[2]!, mediaType: m[1] }
  return { type: 'image', image: image.uri, mediaType: image.mimeType }
}

/** Photo → a caption and accessibility alt text, written by the on-device vision model in one streamed pass. */
export function usePhotoCaption(options: UsePhotoCaptionOptions = {}): PhotoCaptionState {
  const task = useTask(options.component ?? 'photo-caption')
  const [caption, setCaption] = useState('')
  const [alt, setAlt] = useState('')
  const [writing, setWriting] = useState<'caption' | 'alt' | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const run = useCallback(
    async (image: CaptionImage) => {
      const o = optionsRef.current
      setCaption('')
      setAlt('')
      setWriting(null)
      try {
        return await task.execute(
          'vision',
          async (ctx) => {
            const res = streamText({
              model: ctx.resolved.adapter.languageModel!(),
              system: captionInstructions(o.tone, o.instructions),
              messages: [{ role: 'user', content: [imagePart(image), { type: 'text', text: captionPrompt }] }],
              abortSignal: ctx.signal,
              temperature: 0.3,
              onError: () => {},
            })
            let acc = ''
            for await (const part of res.fullStream) {
              if (part.type === 'text-delta') {
                ctx.firstToken()
                acc += part.text
                const p = parseCaption(acc)
                setCaption(p.caption)
                setAlt(p.alt)
                setWriting(p.writing)
                ctx.tokens(estimateTokens(acc))
                ctx.setStatus('streaming')
              } else if (part.type === 'error') throw part.error
            }
            const out = parseCaption(acc)
            const result = { caption: out.caption, alt: out.alt }
            setCaption(result.caption)
            setAlt(result.alt)
            o.onDone?.(result)
            return result
          },
          { localOnly: o.localOnly },
        )
      } finally {
        setWriting(null)
      }
    },
    [task],
  )

  return {
    ...task,
    caption,
    alt,
    writing,
    isBusy: task.status === 'thinking' || task.status === 'streaming',
    run,
    setCaption,
    setAlt,
    reset: () => {
      task.reset()
      setCaption('')
      setAlt('')
      setWriting(null)
    },
  }
}
