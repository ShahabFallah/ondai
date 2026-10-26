import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Search, X } from 'lucide-react-native'
import type { SearchHit } from '@ondai/core'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Chip } from '../chip/chip'
import { Field } from '../field/field'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { Skeleton } from '../skeleton/skeleton'
import { useSemanticSearch, type UseSemanticSearchOptions } from './use-semantic-search'

export interface SemanticSearchProps<M> extends UseSemanticSearchOptions<M> {
  presentation?: 'bar' | 'spotlight' | 'header'
  resultStyle?: 'list' | 'cards' | 'grouped'
  /** Title for the `header` presentation. */
  title?: string
  placeholder?: string
  initialQuery?: string
  autoRun?: boolean
  /** Show matched terms and similarity under each result. */
  showWhy?: boolean
  groupBy?: (hit: SearchHit<M>) => string
  renderItem?: (hit: SearchHit<M>) => ReactNode
  onSelect?: (hit: SearchHit<M>) => void
  /** Debounce ms for search-as-you-type (0 = submit only). */
  debounce?: number
  showBadge?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** A search-by-meaning bar over your own records, with a local vector index, hybrid keyword matching and "why it matched". */
export function SemanticSearch<M = Record<string, unknown>>({ presentation = 'bar', resultStyle = 'list', title = 'Search', placeholder = 'Search by meaning…', initialQuery = '', autoRun = false, showWhy = true, groupBy, renderItem, onSelect, debounce = 250, showBadge = true, open: openProp, onOpenChange, style, testID, ...hookOptions }: SemanticSearchProps<M>) {
  const t = useTheme()
  const motion = useMotion()
  const s = useSemanticSearch<M>(hookOptions)
  const [text, setText] = useState(initialQuery)
  const [openState, setOpenState] = useState(true)
  const open = openProp ?? openState
  const ran = useRef(false)
  useEffect(() => {
    if (autoRun && initialQuery && !ran.current && !s.isIndexing) {
      ran.current = true
      void s.search(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialQuery, s.isIndexing])
  useEffect(() => {
    if (!debounce) return
    const h = setTimeout(() => {
      if (text !== s.query) void s.search(text)
    }, debounce)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, debounce])

  const pick = (h: SearchHit<M>) => {
    void Haptics.selectionAsync().catch(() => {})
    onSelect?.(h)
  }
  const field = (
    <Field
      value={text}
      onChangeText={setText}
      onSubmitEditing={() => void s.search(text)}
      placeholder={placeholder}
      state={s.isSearching ? 'thinking' : 'idle'}
      returnKeyType="search"
      size={presentation === 'header' ? 'lg' : 'md'}
      left={<Search size={16} strokeWidth={1.5} color={t.colors.textTertiary} />}
      right={
        text ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear" hitSlop={8} onPress={() => (setText(''), s.clear())} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} strokeWidth={1.5} color={t.colors.textTertiary} />
          </Pressable>
        ) : undefined
      }
    />
  )
  const why = (h: SearchHit<M>) =>
    showWhy ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {h.why.terms?.slice(0, 3).map((term) => (
          <Chip key={term} size="sm" variant="ghost" label={term} style={{ height: 22 }} />
        ))}
        {h.why.vector !== undefined ? <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{`${Math.round(h.why.vector * 100)}% similar`}</Text> : null}
      </View>
    ) : null
  const item = (h: SearchHit<M>, i: number) => (
    <Animated.View key={h.id} entering={motion.enabled ? FadeInDown.delay(Math.min(i, 6) * 40).duration(180) : undefined}>
      <Pressable
        onPress={() => pick(h)}
        accessibilityRole="button"
        style={({ pressed }) => [
          resultStyle === 'cards'
            ? { padding: 14, borderRadius: t.radii.lg, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: pressed ? t.colors.elevatedHover : t.colors.surface }
            : { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: hairlineWidth, borderBottomColor: t.colors.hairline, backgroundColor: pressed ? t.colors.elevatedHover : 'transparent' },
        ]}
      >
        {renderItem ? (
          renderItem(h)
        ) : (
          <Text style={[typeStyle(t, 'md'), { color: t.colors.text }]} numberOfLines={3}>
            {h.text}
          </Text>
        )}
        {why(h)}
      </Pressable>
    </Animated.View>
  )
  const groups = groupBy ? Object.entries(s.results.reduce<Record<string, SearchHit<M>[]>>((acc, h) => ((acc[groupBy(h)] ??= []).push(h), acc), {})) : null
  const list = (
    <View style={{ gap: resultStyle === 'cards' ? 8 : 0 }}>
      {s.isIndexing && s.indexProgress ? <ModelDownload progress={s.indexProgress[0] / s.indexProgress[1]} variant="bar" size="sm" label="Indexing on device" detail={`${s.indexProgress[0]} of ${s.indexProgress[1]} items`} /> : null}
      {s.isSearching && !s.results.length ? <Skeleton lines={3} height={14} /> : null}
      {s.error ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{s.error.message}</Text> : null}
      {!s.isSearching && s.query && !s.results.length && !s.error ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary, paddingVertical: 12 }]}>Nothing matches yet.</Text> : null}
      {resultStyle === 'grouped' && groups
        ? groups.map(([g, hits]) => (
            <View key={g} style={{ gap: 0 }}>
              <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary, paddingTop: 12, paddingBottom: 4 }]}>{g}</Text>
              {hits.map(item)}
            </View>
          ))
        : s.results.map(item)}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 }}>
        {showBadge ? <OnDeviceBadge size="sm" state={s.isSearching ? 'thinking' : 'idle'} provider={s.provider} locality={s.locality as never} /> : <View />}
        <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{s.mode === 'vector' ? 'meaning + keywords' : 'keywords only'}</Text>
      </View>
    </View>
  )

  if (presentation === 'spotlight') {
    return (
      <Sheet open={open} onClose={() => (setOpenState(false), onOpenChange?.(false))} presentation="spotlight" variant="glass" inline style={style} testID={testID}>
        <View style={{ padding: 10, gap: 8 }}>
          {field}
          {list}
        </View>
      </Sheet>
    )
  }
  return (
    <View style={[{ gap: 10 }, style]} testID={testID}>
      {presentation === 'header' ? <Text style={[typeStyle(t, '3xl', { weight: 'semibold' }), { color: t.colors.text }]}>{title}</Text> : null}
      {field}
      {list}
    </View>
  )
}

export default SemanticSearch
