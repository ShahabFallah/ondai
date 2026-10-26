/**
 * A tiny cva-style helper for React Native style objects.
 *
 * const button = createVariants({
 *   base: { paddingHorizontal: 12 },
 *   variants: { size: { sm: { height: 32 }, md: { height: 40 } }, tone: { solid: {...}, ghost: {...} } },
 *   compound: [{ when: { size: 'sm', tone: 'ghost' }, style: { paddingHorizontal: 8 } }],
 *   defaults: { size: 'md', tone: 'solid' },
 * })
 * button({ size: 'sm' }) → style[]
 */
export type StyleObject = Record<string, unknown>

export type VariantMap = Record<string, Record<string, StyleObject>>

export type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K] | undefined
}

export interface VariantConfig<V extends VariantMap> {
  base?: StyleObject | StyleObject[]
  variants: V
  compound?: Array<{ when: Partial<{ [K in keyof V]: keyof V[K] }>; style: StyleObject }>
  defaults: { [K in keyof V]: keyof V[K] }
}

export interface VariantFn<V extends VariantMap> {
  (props?: VariantProps<V>): StyleObject[]
  /** Resolved variant values for the given props (defaults applied). */
  resolve(props?: VariantProps<V>): { [K in keyof V]: keyof V[K] }
  /** Every option per variant key, for playground controls. */
  options: { [K in keyof V]: Array<keyof V[K]> }
}

export function createVariants<V extends VariantMap>(config: VariantConfig<V>): VariantFn<V> {
  const keys = Object.keys(config.variants) as Array<keyof V>
  const options = Object.fromEntries(
    keys.map((k) => [k, Object.keys(config.variants[k] ?? {}) as Array<keyof V[typeof k]>]),
  ) as VariantFn<V>['options']

  const resolve = (props: VariantProps<V> = {}) => {
    const out = {} as { [K in keyof V]: keyof V[K] }
    for (const k of keys) {
      const v = props[k]
      out[k] = (v !== undefined && v !== null ? v : config.defaults[k]) as keyof V[typeof k]
    }
    return out
  }

  const fn = ((props?: VariantProps<V>) => {
    const resolved = resolve(props)
    const styles: StyleObject[] = []
    if (config.base) styles.push(...(Array.isArray(config.base) ? config.base : [config.base]))
    for (const k of keys) {
      const s = config.variants[k]?.[resolved[k] as string]
      if (s) styles.push(s)
    }
    for (const c of config.compound ?? []) {
      const matches = (Object.keys(c.when) as Array<keyof V>).every((k) => resolved[k] === c.when[k])
      if (matches) styles.push(c.style)
    }
    return styles
  }) as VariantFn<V>
  fn.resolve = resolve
  fn.options = options
  return fn
}
