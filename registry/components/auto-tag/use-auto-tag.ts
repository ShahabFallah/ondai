import { useCallback, useMemo, useRef, useState } from 'react'
import { matchEnumList, useStructured, type StructuredState } from '@ondai/core'
import { autoTagInstructions } from './prompts'
import { tagsSchema } from './schema'

export interface UseAutoTagOptions {
  /** The app's own tag list. The model can only choose from these. */
  tags: string[]
  max?: number
  aliases?: Record<string, string[]>
  instructions?: string
  component?: string
  localOnly?: boolean
}

export interface AutoTagState extends Omit<StructuredState<{ tags: string[] }>, 'run' | 'object'> {
  suggestions: string[]
  run: (text: string) => Promise<string[]>
  isBusy: boolean
}

/** Tag and category suggestions constrained to the app's own list; fuzzy-matched after the model answers. */
export function useAutoTag(options: UseAutoTagOptions): AutoTagState {
  const { tags, max = 3, aliases, instructions, component = 'auto-tag', localOnly } = options
  const [suggestions, setSuggestions] = useState<string[]>([])
  const schema = useMemo(() => tagsSchema(tags), [tags])
  const tagsRef = useRef(tags)
  tagsRef.current = tags
  const structured = useStructured({
    schema,
    instructions: autoTagInstructions(tags, max, instructions),
    component,
    localOnly,
    refine: (obj) => {
      const matched = matchEnumList(obj.tags, tagsRef.current, { aliases }).slice(0, max)
      return { object: { tags: matched }, confidence: obj.tags.length ? matched.length / obj.tags.length : 0.5 }
    },
  })
  const structuredRun = structured.run
  const run = useCallback(
    async (text: string) => {
      setSuggestions([])
      const r = await structuredRun(text)
      setSuggestions(r.tags)
      return r.tags
    },
    [structuredRun],
  )
  return { ...structured, suggestions, run, isBusy: structured.isLoading, reset: () => (structured.reset(), setSuggestions([])) }
}
