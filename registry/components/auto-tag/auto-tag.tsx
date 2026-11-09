import { useEffect, useRef, type ComponentType, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Check, CheckCheck, CircleAlert, Hash, Plus, Tag } from 'lucide-react-native'
import type { FontSizeKey, SkinInput, SkinTokens } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { SkinRowFace, SkinTile, skinHasWells, Surface } from '../surface/surface'
import { Skeleton } from '../skeleton/skeleton'
import { useAutoTag, type UseAutoTagOptions } from './use-auto-tag'

/** Every icon AutoTag draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface AutoTagIcons {
  /** Beside the title. */
  header: IconInput
  /** On a suggested tag. */
  add: IconInput
  /** On an accepted tag. */
  accepted: IconInput
  /** Rows in the `dropdown` presentation. */
  tag: IconInput
  /** The "Add all" key. */
  addAll: IconInput
  /** Beside the empty line. */
  empty: IconInput
  error: IconInput
}

/** Every string AutoTag shows or announces. */
export interface AutoTagLabels {
  /** Title of the `chips` card. */
  title: string
  /** Shown while the model reads the text. */
  thinking: string
  /** Title of the `dropdown` panel. */
  suggested: string
  /** "2 suggested" beside the Add all key. */
  pending: string
  addAll: string
  /** Shown when no tag from the list fits. */
  empty: string
  /** Screen reader names: "Add tag travel", "Remove tag travel". */
  add: string
  remove: string
}

export const autoTagLabels: AutoTagLabels = {
  title: 'Suggested tags',
  thinking: 'Finding tags',
  suggested: 'Suggested',
  pending: 'suggested',
  addAll: 'Add all',
  empty: 'No tag on your list fits this one.',
  add: 'Add tag',
  remove: 'Remove tag',
}

/** Styles for each part, applied after the component's own. */
export interface AutoTagStyles {
  /** The outer view. */
  container: StyleProp<ViewStyle>
  /** The card (`chips`) or panel (`dropdown`). */
  panel: StyleProp<ViewStyle>
  header: StyleProp<ViewStyle>
  title: StyleProp<TextStyle>
  tags: StyleProp<ViewStyle>
  tag: StyleProp<ViewStyle>
  /** A row in the `dropdown`. */
  row: StyleProp<ViewStyle>
  footer: StyleProp<ViewStyle>
}

/** What `renderTag` gets for each tag. */
export interface AutoTagTagProps {
  tag: string
  selected: boolean
  /** True while the model proposed it and nobody accepted it yet. */
  suggested: boolean
  index: number
  toggle: () => void
  /** The icon AutoTag would draw (add or accepted). */
  icon: ReactNode
}

export interface AutoTagProps extends UseAutoTagOptions {
  /** The content to tag. */
  text: string
  selected: string[]
  onChange: (tags: string[]) => void
  /** Layout: a `chips` card, `inlineGhost` tags that sit under a field, or a `dropdown` list. */
  presentation?: 'chips' | 'inlineGhost' | 'dropdown'
  /** The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the card, the tags, the tiles and the key together. */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for accepted tags, tiles and the key. Defaults to the theme accent. */
  tint?: string
  /** Card corner radius. Defaults to the variant's. Tags stay round. */
  radius?: number
  icons?: Partial<AutoTagIcons>
  labels?: Partial<AutoTagLabels>
  styles?: Partial<AutoTagStyles>
  multi?: boolean
  autoRun?: boolean
  showBadge?: boolean
  /** Draw a tag yourself. */
  renderTag?: (props: AutoTagTagProps) => ReactNode
  /** Shown when the model found nothing that fits. Return null to show nothing. */
  renderEmpty?: () => ReactNode
  /** Draw the "Add all" key yourself. */
  renderAddAll?: (props: { addAll: () => void; count: number }) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<AutoTagProps['size']>
const sizes: Record<Size, { chip: 'sm' | 'md'; chipStyle?: ViewStyle; title: FontSizeKey; row: FontSizeKey; icon: number; tile: number; pad: number; rowHeight: number; key: 'sm' | 'md' }> = {
  sm: { chip: 'sm', title: 'sm', row: 'sm', icon: 12, tile: 20, pad: 12, rowHeight: 38, key: 'sm' },
  md: { chip: 'md', title: 'md', row: 'md', icon: 14, tile: 24, pad: 14, rowHeight: 44, key: 'sm' },
  lg: { chip: 'md', chipStyle: { height: 38, paddingHorizontal: 15 }, title: 'lg', row: 'lg', icon: 15, tile: 28, pad: 16, rowHeight: 52, key: 'md' },
}
type Z = (typeof sizes)[Size]

/** Tag suggestions from the app's own list: a card of chips, faded inline ghosts, or a dropdown. Multi-select with a max. */
export function AutoTag({ variant, tint, ...props }: AutoTagProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <AutoTagInner {...props} tint={tint} />
    </SkinProvider>
  )
}

function AutoTagInner({
  text,
  selected,
  onChange,
  presentation = 'chips',
  size = 'md',
  tint,
  radius,
  icons = {},
  labels: labelsProp,
  styles = {},
  multi = true,
  autoRun = true,
  showBadge = true,
  renderTag,
  renderEmpty,
  renderAddAll,
  style,
  testID,
  ...hookOptions
}: Omit<AutoTagProps, 'variant'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: AutoTagLabels = { ...autoTagLabels, ...labelsProp }
  const at = useAutoTag(hookOptions)
  const last = useRef('')
  useEffect(() => {
    if (!autoRun || !text.trim() || last.current === text) return
    const go = () => {
      last.current = text
      void at.run(text).catch(() => {})
    }
    // Tag the first text right away; debounce edits after that.
    if (!last.current) return go()
    const h = setTimeout(go, 350)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoRun])

  const toggle = (tag: string) => {
    void Haptics.selectionAsync().catch(() => {})
    if (selected.includes(tag)) onChange(selected.filter((x) => x !== tag))
    else onChange(multi ? [...selected, tag] : [tag])
  }
  const pending = at.suggestions.filter((x) => !selected.includes(x))
  const addAll = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onChange([...selected, ...pending])
  }
  const thinking = at.isBusy && !at.suggestions.length
  const done = !at.isBusy && !at.error && at.status === 'done'
  const empty = done && !at.suggestions.length && !selected.length
  const enter = (i: number) => (motion.enabled ? FadeIn.delay(i * 40).duration(180) : undefined)
  const layout = motion.enabled ? LinearTransition.duration(180) : undefined
  const chipHeight = z.chipStyle?.height ?? (z.chip === 'sm' ? 26 : 32)
  const skeletons = [64, 88, 56].map((w, i) => <Skeleton key={i} width={w + (z.chip === 'md' ? 8 : 0)} height={chipHeight as number} radius={(chipHeight as number) / 2} dashed />)

  // The tag's own ink, so the add and check marks follow the chip in every variant.
  const chipInk = (on: boolean) => (s.skin !== 'clean' ? (on ? s.chip.selectedFg : s.chip.fgMuted) : on ? (tint ? s.onTint : t.colors.bg) : t.colors.textTertiary)
  const tagIcon = (on: boolean) => renderIcon(on ? icons.accepted : icons.add, on ? Check : Plus, { size: z.icon, strokeWidth: on ? 2.25 : 2, color: chipInk(on) })

  /** A tag: quiet with a plus until accepted, then filled in the tint with a check. */
  const tagChip = (tag: string, i: number, ghost = false) => {
    const on = selected.includes(tag)
    const icon = tagIcon(on)
    return (
      <Animated.View key={tag} entering={enter(i)} layout={layout}>
        {renderTag ? (
          renderTag({ tag, selected: on, suggested: !on, index: i, toggle: () => toggle(tag), icon })
        ) : (
          <Chip label={tag} size={z.chip} tint={tint} variant={ghost ? 'outline' : 'soft'} selected={on} ghost={ghost && !on} icon={icon} onPress={() => toggle(tag)} accessibilityLabel={`${on ? labels.remove : labels.add} ${tag}`} style={[z.chipStyle, styles.tag]} />
        )}
      </Animated.View>
    )
  }
  /** An accepted tag with a remove button (inline and dropdown). */
  const acceptedChip = (x: string) => <Chip label={x} size={z.chip} tint={tint} variant="solid" icon={tagIcon(true)} onRemove={() => toggle(x)} removeLabel={`${labels.remove} ${x}`} style={[z.chipStyle, styles.tag]} />
  const tile = (icon: IconInput | undefined, fallback: ComponentType<IconProps>) => <Tile z={z}>{renderIcon(icon, fallback, tileInk(s, z))}</Tile>
  const errorLine = at.error ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {renderIcon(icons.error, CircleAlert, { size: 14, strokeWidth: 1.75, color: t.colors.danger })}
      <Text style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.textSecondary }]} numberOfLines={2}>
        {at.error.message}
      </Text>
    </View>
  ) : null
  const emptyLine = empty ? (
    renderEmpty ? (
      renderEmpty()
    ) : (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {renderIcon(icons.empty, Tag, { size: 14, strokeWidth: 1.75, color: t.colors.textTertiary })}
        <Text style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.textSecondary }]}>{labels.empty}</Text>
      </View>
    )
  ) : null
  const keyRole = s.skin === 'clean' || s.skin === 'minimal' ? 'raised' : 'solid'
  const addAllKey =
    multi && pending.length > 1 ? (
      renderAddAll ? (
        renderAddAll({ addAll, count: pending.length })
      ) : (
        <Button title={labels.addAll} variant={keyRole} size={z.key} icon={icons.addAll === null ? undefined : (icons.addAll ?? CheckCheck)} onPress={addAll} testID={testID ? `${testID}-add-all` : undefined} />
      )
    ) : null
  const panelRadius = radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)

  if (presentation === 'inlineGhost') {
    return (
      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }, style, styles.container, styles.tags]} testID={testID}>
        {selected.map((x) => (
          <Animated.View key={x} layout={layout}>
            {acceptedChip(x)}
          </Animated.View>
        ))}
        {thinking ? skeletons[0] : null}
        {pending.map((x, i) => tagChip(x, i, true))}
        {errorLine}
        {emptyLine}
      </View>
    )
  }

  if (presentation === 'dropdown') {
    return (
      <View style={[{ gap: 8 }, style, styles.container]} testID={testID}>
        {selected.length ? (
          <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, styles.tags]}>
            {selected.map((x) => (
              <View key={x}>{acceptedChip(x)}</View>
            ))}
          </View>
        ) : null}
        {pending.length || at.isBusy || at.error || empty ? (
          <Surface elevation="floating" radius={panelRadius} style={[{ overflow: 'hidden' }, styles.panel]}>
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 }, styles.header]}>
              {thinking ? (
                <ShimmerText size="sm" active>
                  {labels.thinking}
                </ShimmerText>
              ) : (
                <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { flex: 1, color: t.colors.textTertiary }, styles.title]}>{labels.suggested}</Text>
              )}
              {addAllKey ? <View style={{ marginLeft: 'auto' }}>{addAllKey}</View> : null}
            </View>
            <View style={{ paddingHorizontal: 6, paddingBottom: 6, gap: 2 }}>
              {thinking ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
                  {[0.4, 0.28].map((w, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Skeleton width={z.tile + 6} height={z.tile + 6} radius={8} />
                      <Skeleton width={`${w * 100}%`} height={10} radius={5} />
                    </View>
                  ))}
                </View>
              ) : null}
              {errorLine ? <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>{errorLine}</View> : null}
              {emptyLine ? <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>{emptyLine}</View> : null}
              {pending.map((x, i) =>
                renderTag ? (
                  <View key={x}>{renderTag({ tag: x, selected: false, suggested: true, index: i, toggle: () => toggle(x), icon: renderIcon(icons.tag, Hash, tileInk(s, z)) })}</View>
                ) : (
                  <Animated.View key={x} entering={enter(i)}>
                    <TagRow tag={x} z={z} s={s} icon={renderIcon(icons.tag, Hash, tileInk(s, z))} trailing={renderIcon(icons.add, Plus, { size: 16, strokeWidth: 1.75, color: t.colors.textTertiary })} onPress={() => toggle(x)} label={`${labels.add} ${x}`} style={styles.row} />
                  </Animated.View>
                ),
              )}
            </View>
          </Surface>
        ) : null}
        {showBadge ? <OnDeviceBadge size="sm" state={at.status} provider={at.provider} locality={at.locality as never} /> : null}
      </View>
    )
  }

  const shown = [...selected.filter((x) => !at.suggestions.includes(x)), ...at.suggestions]
  return (
    <Surface elevation="card" radius={panelRadius} style={[{ padding: z.pad, gap: 12 }, style, styles.container, styles.panel]} testID={testID}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: z.tile + 4 }, styles.header]}>
        {tile(icons.header, Tag)}
        <View style={{ flex: 1, minWidth: 0 }}>
          {thinking ? (
            <ShimmerText size="sm" active>
              {labels.thinking}
            </ShimmerText>
          ) : (
            <Text style={[typeStyle(t, z.title, { weight: 'medium' }), { color: t.colors.text }, styles.title]} numberOfLines={1}>
              {labels.title}
            </Text>
          )}
        </View>
        {showBadge ? <OnDeviceBadge size="sm" style={{ alignSelf: 'center' }} state={at.status} provider={at.provider} locality={at.locality as never} /> : null}
      </View>
      {thinking || shown.length ? <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, styles.tags]}>{thinking ? skeletons : shown.map((x, i) => tagChip(x, i))}</View> : null}
      {errorLine}
      {emptyLine}
      {addAllKey ? (
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12, marginTop: 2, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }, styles.footer]}>
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary, fontVariant: ['tabular-nums'] }]}>{`${pending.length} ${labels.pending}`}</Text>
          {addAllKey}
        </View>
      ) : null}
    </Surface>
  )
}

/* ---------------------------------------------------------------------------------------------- */

const tileInk = (s: SkinTokens, z: Z) => ({ size: z.icon + 2, strokeWidth: 1.75, color: skinHasWells(s.skin) ? s.tile.ink : s.container.fgMuted })

/** A fixed slot so text lines up. Expressive variants seat the icon on a tile in their material. */
function Tile({ children, z }: { children: ReactNode; z: Z }) {
  const s = useSkin()
  if (children === null || children === undefined || children === false) return null
  if (skinHasWells(s.skin)) return <SkinTile size={z.tile + 4}>{children}</SkinTile>
  return <View style={{ width: z.tile - 4, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
}

function TagRow({ tag, icon, trailing, onPress, label, z, s, style }: { tag: string; icon: ReactNode; trailing: ReactNode; onPress: () => void; label: string; z: Z; s: SkinTokens; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  const r = Math.max(8, s.radius.control)
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: z.rowHeight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: r }, style]}>
      {(st) => (
        <>
          {st.pressed || (st as { hovered?: boolean }).hovered ? <SkinRowFace radius={r} /> : null}
          <Tile z={z}>{icon}</Tile>
          <Text style={[typeStyle(t, z.row), { flex: 1, color: t.colors.text }]} numberOfLines={1}>
            {tag}
          </Text>
          {trailing}
        </>
      )}
    </Pressable>
  )
}

export default AutoTag
