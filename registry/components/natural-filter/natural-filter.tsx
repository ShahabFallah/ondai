import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { SlidersHorizontal, Search, X } from 'lucide-react-native'
import type { z } from 'zod'
import { typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { Field } from '../field/field'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { Skeleton } from '../skeleton/skeleton'
import { useNaturalFilter, type FilterChip, type UseNaturalFilterOptions } from './use-natural-filter'

export interface NaturalFilterProps<S extends z.ZodObject<z.ZodRawShape>> extends UseNaturalFilterOptions<S> {
  presentation?: 'bar' | 'sheet' | 'inline'
  chipStyle?: 'soft' | 'outline'
  placeholder?: string
  initialQuery?: string
  autoRun?: boolean
  showBadge?: boolean
  /** Inline presentation: a filter object to display instead of running the model. */
  value?: Partial<z.infer<S>>
  /** Rendered below the chips (results list). */
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** "cheap Italian open now" becomes a typed filter and editable chips. Bar, sheet, or chips-only inline. */
export function NaturalFilter<S extends z.ZodObject<z.ZodRawShape>>({ presentation = 'bar', chipStyle = 'soft', placeholder = 'Search in your own words…', initialQuery = '', autoRun = false, showBadge = true, value, children, style, testID, ...hookOptions }: NaturalFilterProps<S>) {
  const t = useTheme()
  const motion = useMotion()
  const nf = useNaturalFilter(hookOptions)
  const [query, setQuery] = useState(initialQuery)
  const [sheetOpen, setSheetOpen] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (value) {
      for (const [k, v] of Object.entries(value)) nf.set(k as never, v)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value ?? null)])
  useEffect(() => {
    if (autoRun && initialQuery && !ran.current) {
      ran.current = true
      void nf.run(initialQuery).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialQuery])
  useEffect(() => {
    if (nf.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [nf.status])

  const submit = () => {
    if (!query.trim()) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    void nf.run(query).catch(() => {})
  }
  const cycle = (c: FilterChip) => {
    if (!c.options?.length) return
    const i = c.options.indexOf(String(c.value))
    nf.set(c.key as never, c.options[(i + 1) % c.options.length])
    void Haptics.selectionAsync().catch(() => {})
  }
  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
      {nf.isLoading && !nf.chips.length ? (
        <>
          <Skeleton width={90} height={28} radius="pill" />
          <Skeleton width={70} height={28} radius="pill" />
          <Skeleton width={110} height={28} radius="pill" />
        </>
      ) : null}
      {nf.chips.map((c, i) => (
        <Animated.View key={c.key} entering={motion.enabled ? FadeInRight.delay(i * 50).duration(180) : undefined}>
          <Chip
            size="sm"
            variant={chipStyle}
            label={`${c.label}: ${c.display}`}
            ghost={c.confidence < 0.6}
            onPress={c.options ? () => cycle(c) : undefined}
            onRemove={() => nf.remove(c.key as never)}
            accessibilityLabel={`${c.label} ${c.display}${c.options ? ', tap to change' : ''}`}
          />
        </Animated.View>
      ))}
      {nf.chips.length > 1 ? (
        <Pressable onPress={nf.clear} accessibilityRole="button" accessibilityLabel="Clear filters" style={{ height: 28, paddingHorizontal: 8, justifyContent: 'center' }}>
          <Text style={[typeStyle(t, 'xs', { mono: true, tag: true }), { color: t.colors.textTertiary }]}>clear</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  )
  const error = nf.error ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{nf.error.message}</Text> : null
  const badge = showBadge ? <OnDeviceBadge size="sm" state={nf.status} provider={nf.provider} locality={nf.locality as never} /> : null

  if (presentation === 'inline') {
    return (
      <View style={[{ gap: 8 }, style]} testID={testID}>
        {chips}
        {children}
      </View>
    )
  }
  const input = (
    <Field
      value={query}
      onChangeText={setQuery}
      onSubmitEditing={submit}
      placeholder={placeholder}
      state={nf.status}
      returnKeyType="search"
      left={<Search size={16} strokeWidth={1.5} color={t.colors.textTertiary} />}
      right={
        query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear" hitSlop={8} onPress={() => (setQuery(''), nf.clear())} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} strokeWidth={1.5} color={t.colors.textTertiary} />
          </Pressable>
        ) : presentation === 'sheet' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Edit filters" hitSlop={8} onPress={() => setSheetOpen(true)} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <SlidersHorizontal size={16} strokeWidth={1.5} color={t.colors.textSecondary} />
          </Pressable>
        ) : undefined
      }
    />
  )
  if (presentation === 'sheet') {
    return (
      <View style={[{ gap: 8 }, style]} testID={testID}>
        {input}
        {nf.chips.length ? chips : null}
        {error}
        {children}
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} presentation="sheet" variant="solid" inline>
          <View style={{ padding: 20, gap: 14 }}>
            <Text style={[typeStyle(t, 'lg', { weight: 'medium' }), { color: t.colors.text }]}>Filters</Text>
            {nf.fieldInfo.map((f) => {
              const v = (nf.filter as Record<string, unknown>)[f.name]
              return (
                <View key={f.name} style={{ gap: 6 }}>
                  <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary }]}>{hookOptions.labels?.[f.name as never] ?? f.name}</Text>
                  {f.type === 'enum' ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {f.options?.map((o) => (
                        <Chip key={o} size="sm" label={o} variant="outline" selected={v === o} onPress={() => nf.set(f.name as never, v === o ? undefined : o)} />
                      ))}
                    </View>
                  ) : f.type === 'boolean' ? (
                    <Chip size="sm" label={v ? 'yes' : 'no'} variant="outline" selected={!!v} onPress={() => nf.set(f.name as never, !v)} />
                  ) : (
                    <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{v === undefined ? '—' : String(v)}</Text>
                  )}
                </View>
              )
            })}
            <Button title="Done" variant="solid" onPress={() => setSheetOpen(false)} />
          </View>
        </Sheet>
        {badge}
      </View>
    )
  }
  return (
    <View style={[{ gap: 8 }, style]} testID={testID}>
      {input}
      {(nf.chips.length || nf.isLoading) ? chips : null}
      {error}
      {children}
      {badge}
    </View>
  )
}

export default NaturalFilter
