import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Platform, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { Ban, Check, CircleAlert, Pencil, ShieldAlert, ShieldCheck, ShieldQuestionMark, Wrench } from 'lucide-react-native'
import { humanize, type PendingConfirmation, type ToolRisk } from '@ondai/core'
import type { FontSizeKey, SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Sheet } from '../sheet/sheet'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { SkinTile, SkinWell, skinHasWells, Surface } from '../surface/surface'

export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error' | 'denied'

/** Every icon the card draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface ToolConfirmCardIcons {
  /** The trace line above the card ("Wants to run") and the running line. */
  tool: IconInput
  /** The tile in the card's header, one per risk. */
  riskLow: IconInput
  riskMedium: IconInput
  riskHigh: IconInput
  /** The edit key, and the same key while editing. */
  edit: IconInput
  editDone: IconInput
  /** On the deny and confirm keys. None by default. */
  deny: IconInput
  confirm: IconInput
  /** The line left behind once the call ran, failed or was denied. */
  done: IconInput
  error: IconInput
  denied: IconInput
}

/** Every string the card shows or announces. Parameter names are `fieldLabels`. */
export interface ToolConfirmCardLabels {
  /** Before the tool's name in the trace line: "Wants to run sendEmail". */
  wantsToRun: string
  riskLow: string
  riskMedium: string
  riskHigh: string
  edit: string
  editDone: string
  deny: string
  confirm: string
  /** After the tool's name when it failed: "sendEmail failed". */
  failed: string
  /** Before the tool's name when it was denied: "Skipped sendEmail". */
  skipped: string
  /** Beside a denied call. */
  denied: string
}

/** Styles for each part, applied after the card's own. */
export interface ToolConfirmCardStyles {
  /** The outer view. */
  container: StyleProp<ViewStyle>
  trace: StyleProp<ViewStyle>
  card: StyleProp<ViewStyle>
  header: StyleProp<ViewStyle>
  title: StyleProp<TextStyle>
  description: StyleProp<TextStyle>
  /** The well that holds the parameters. */
  fields: StyleProp<ViewStyle>
  field: StyleProp<ViewStyle>
  fieldLabel: StyleProp<TextStyle>
  fieldValue: StyleProp<TextStyle>
  actions: StyleProp<ViewStyle>
  /** The collapsed line after the person answered. */
  status: StyleProp<ViewStyle>
}

export const toolConfirmCardLabels: ToolConfirmCardLabels = {
  wantsToRun: 'Wants to run',
  riskLow: 'Low risk',
  riskMedium: 'Needs your OK',
  riskHigh: 'High risk',
  edit: 'Edit',
  editDone: 'Done',
  deny: 'Deny',
  confirm: 'Confirm',
  failed: 'failed',
  skipped: 'Skipped',
  denied: 'You said no',
}

export interface ToolFieldProps {
  /** The parameter's key, e.g. `when`. */
  name: string
  /** Its label: `fieldLabels[name]` or the key in words. */
  label: string
  value: unknown
  /** The value as text (what the editor shows). */
  text: string
  editing: boolean
  onChangeText: (text: string) => void
}

export interface ToolActionsProps {
  approve: () => void
  deny: () => void
  risk: ToolRisk
  /** True when the parameters can be edited. */
  canEdit: boolean
  editing: boolean
  toggleEdit: () => void
}

export interface ToolStatusProps {
  status: Exclude<ToolCallStatus, 'pending'>
  pending: PendingConfirmation
  result?: string
  errorMessage?: string
}

export interface ToolConfirmCardProps {
  pending: PendingConfirmation | null
  /**
   * Layout: `card` (a trace line over a card), `sheet` (rises from the bottom), `banner` (one compact row:
   * what will run and the two keys) or `inline` (a card without the trace line, for inside another panel).
   */
  presentation?: 'card' | 'sheet' | 'banner' | 'inline'
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the card,
   * the parameter well, the icon tile and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the confirm key, tiles and glow. Defaults to the theme accent. */
  tint?: string
  /** Card corner radius. Defaults to the variant's. */
  radius?: number
  /** Allow editing parameters before approving. */
  editable?: boolean
  /** Open with the parameters already in edit mode. */
  defaultEditing?: boolean
  onApprove?: (input: Record<string, unknown>) => void
  onCancel?: () => void
  /** Names for parameter keys: `{ when: 'When' }`. Unnamed keys are humanized. */
  fieldLabels?: Record<string, string>
  icons?: Partial<ToolConfirmCardIcons>
  labels?: Partial<ToolConfirmCardLabels>
  styles?: Partial<ToolConfirmCardStyles>
  /** The trace line over the card ("Wants to run sendEmail · High risk"). Card presentation only. */
  showTrace?: boolean
  /** Where the call is. `pending` asks for approval; the others collapse to a single trace line. Default `pending`. */
  status?: ToolCallStatus
  /** Short outcome shown after the call ran, e.g. "Sent to priya@example.com". */
  result?: string
  /** Error message shown when `status` is `error`. */
  errorMessage?: string
  /** Shimmering sentence while the call runs, e.g. "Sending to Priya". Defaults to the title. */
  runningLabel?: string
  /** Draw one parameter row yourself (a date picker, a contact chip). */
  renderField?: (field: ToolFieldProps) => ReactNode
  /** Draw the deny and confirm keys yourself (hold to confirm, Face ID). */
  renderActions?: (actions: ToolActionsProps) => ReactNode
  /** Draw the collapsed line once the call ran, failed or was denied. */
  renderStatus?: (state: ToolStatusProps) => ReactNode
  /** Shown while nothing is waiting for approval (`pending` is null). Nothing by default. */
  renderEmpty?: () => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<ToolConfirmCardProps['size']>
const sizes: Record<Size, { title: FontSizeKey; body: FontSizeKey; meta: FontSizeKey; pad: number; gap: number; tile: number; icon: number; key: 'sm' | 'md' | 'lg'; label: number; rowPad: number }> = {
  sm: { title: 'md', body: 'xs', meta: 'xs', pad: 12, gap: 10, tile: 28, icon: 14, key: 'sm', label: 52, rowPad: 7 },
  md: { title: 'lg', body: 'sm', meta: 'sm', pad: 14, gap: 12, tile: 32, icon: 16, key: 'sm', label: 64, rowPad: 9 },
  lg: { title: 'xl', body: 'md', meta: 'md', pad: 18, gap: 14, tile: 38, icon: 18, key: 'md', label: 76, rowPad: 11 },
}
type Z = (typeof sizes)[Size]

const riskTone: Record<ToolRisk, 'muted' | 'warn' | 'danger'> = { low: 'muted', medium: 'warn', high: 'danger' }
const riskIcon: Record<ToolRisk, ComponentType<IconProps>> = { low: ShieldCheck, medium: ShieldQuestionMark, high: ShieldAlert }

const asText = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v))
/** A key's icon slot: the override, else the default. Components are coloured by the key, so they follow the variant. */
const keyIcon = (override: IconInput | undefined, fallback?: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

/**
 * Approval for any tool call: the call as a trace line, then a card with what will run, its parameters in a
 * well, and deny and confirm keys. Once answered it collapses to one line: running, done, failed or skipped.
 */
export function ToolConfirmCard({ variant, tint, ...props }: ToolConfirmCardProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <ConfirmInner {...props} />
    </SkinProvider>
  )
}

function ConfirmInner({
  pending,
  presentation = 'card',
  size = 'md',
  radius,
  editable = true,
  defaultEditing = false,
  onApprove,
  onCancel,
  fieldLabels,
  icons = {},
  labels: labelsProp,
  styles = {},
  showTrace = true,
  status = 'pending',
  result,
  errorMessage,
  runningLabel,
  renderField,
  renderActions,
  renderStatus,
  renderEmpty,
  style,
  testID,
}: Omit<ToolConfirmCardProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels = { ...toolConfirmCardLabels, ...labelsProp }
  const [editing, setEditing] = useState(defaultEditing)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const lift = useSharedValue(0)
  useEffect(() => {
    setEditing(defaultEditing)
    setDraft(Object.fromEntries(Object.entries(pending?.input ?? {}).map(([k, v]) => [k, asText(v)])))
    lift.value = 0
    lift.value = motion.enabled ? withSpring(1, t.springs.smooth) : 1
  }, [pending?.id, motion.enabled, lift, t.springs.smooth, pending?.input, defaultEditing])
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - lift.value) * 4 }], opacity: lift.value }), [lift])

  if (!pending) return renderEmpty ? <View style={[style, styles.container]} testID={testID}>{renderEmpty()}</View> : null

  const tone = riskTone[pending.risk]
  const riskLabel = pending.risk === 'high' ? labels.riskHigh : pending.risk === 'medium' ? labels.riskMedium : labels.riskLow
  const wells = skinHasWells(s.skin)
  const approve = () => {
    const input = editing
      ? Object.fromEntries(
          Object.entries(draft).map(([k, v]) => {
            const orig = pending.input[k]
            if (typeof orig === 'number') return [k, Number(v)]
            if (typeof orig === 'boolean') return [k, v === 'true']
            if (orig && typeof orig === 'object') {
              try {
                return [k, JSON.parse(v)]
              } catch {
                return [k, v]
              }
            }
            return [k, v]
          }),
        )
      : pending.input
    if (onApprove) onApprove(input)
    else pending.confirm(input)
  }
  const deny = () => (onCancel ? onCancel() : pending.cancel('Cancelled'))
  const entries = Object.entries(pending.input ?? {}).filter(([, v]) => v !== undefined)
  const canEdit = editable && entries.length > 0
  const toggleEdit = () => setEditing((e) => !e)
  const question = /[?.!]$/.test(pending.title) ? pending.title : `${pending.title}?`
  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  const meta = typeStyle(t, z.meta)
  const quietInk = (danger = false) => (danger ? t.colors.danger : t.colors.textTertiary)

  // The tool's name as code: a small key in the variant's inset paint.
  const code = (
    <View
      style={{
        paddingHorizontal: 6,
        height: z.meta === 'xs' ? 18 : 22,
        justifyContent: 'center',
        borderRadius: 6,
        backgroundColor: s.skin === 'minimal' ? 'transparent' : s.skin === 'clean' || s.skin === 'shine' ? t.colors.muted : s.inset.fill,
        borderWidth: s.skin === 'pop' ? 1.5 : hairlineWidth,
        borderColor: s.skin === 'pop' ? s.inset.border : t.colors.hairlineStrong,
      }}
    >
      <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.text }]} numberOfLines={1}>
        {pending.toolName}
      </Text>
    </View>
  )
  const words = (str: string, color = t.colors.textSecondary) => <Text style={[meta, { color }]}>{str}</Text>

  // Collapsed trace line once the person answered.
  if (status !== 'pending') {
    if (renderStatus) {
      return (
        <Animated.View entering={fade} style={[style, styles.container]} testID={testID} accessibilityLiveRegion="polite">
          {renderStatus({ status, pending, result, errorMessage })}
        </Animated.View>
      )
    }
    const ink = { size: z.icon, strokeWidth: 1.75 }
    const icon =
      status === 'done'
        ? renderIcon(icons.done, Check, { ...ink, strokeWidth: 2, color: wells ? s.tile.ink : t.colors.textSecondary })
        : status === 'error'
          ? renderIcon(icons.error, CircleAlert, { ...ink, color: wells ? s.tile.ink : t.colors.danger })
          : status === 'denied'
            ? renderIcon(icons.denied, Ban, { ...ink, color: wells ? s.tile.ink : t.colors.textTertiary })
            : renderIcon(icons.tool, Wrench, { ...ink, color: wells ? s.tile.ink : t.colors.textTertiary })
    return (
      <Animated.View entering={fade} style={[style, styles.container]} testID={testID} accessibilityLiveRegion="polite">
        <TraceRow icon={icon} z={z} style={styles.status}>
          {status === 'running' ? (
            <ShimmerText size={z.meta} weight="regular" active>
              {runningLabel ?? pending.title}
            </ShimmerText>
          ) : (
            <View style={line.wrap}>
              {status === 'done' ? (
                words(pending.title, t.colors.text)
              ) : status === 'error' ? (
                <>
                  {code}
                  {words(labels.failed, t.colors.danger)}
                </>
              ) : (
                <>
                  {words(labels.skipped)}
                  {code}
                </>
              )}
              {status === 'done' && result ? words(result, t.colors.textTertiary) : status === 'error' && errorMessage ? words(errorMessage, t.colors.textTertiary) : status === 'denied' ? words(labels.denied, t.colors.textTertiary) : null}
            </View>
          )}
        </TraceRow>
      </Animated.View>
    )
  }

  const trace = (
    <TraceRow icon={renderIcon(icons.tool, Wrench, { size: z.icon, strokeWidth: 1.75, color: wells ? s.tile.ink : t.colors.textTertiary })} z={z} style={styles.trace}>
      <View style={line.wrap}>
        {words(labels.wantsToRun)}
        {code}
        {words(riskLabel, quietInk(tone === 'danger'))}
      </View>
    </TraceRow>
  )

  const tileIcon = renderIcon(pending.risk === 'high' ? icons.riskHigh : pending.risk === 'medium' ? icons.riskMedium : icons.riskLow, riskIcon[pending.risk], {
    size: z.icon,
    strokeWidth: 1.75,
    color: wells ? s.tile.ink : tone === 'danger' ? t.colors.danger : t.colors.textSecondary,
  })

  const header = (compact: boolean) => (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: z.gap, flex: compact ? 1 : undefined, minWidth: 0 }, styles.header]}>
      <Tile size={z.tile} danger={tone === 'danger'}>
        {tileIcon}
      </Tile>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[typeStyle(t, compact ? z.body : z.title, { weight: 'semibold' }), { color: t.colors.text }, styles.title]} numberOfLines={compact ? 1 : 2}>
          {question}
        </Text>
        {compact ? (
          <Text style={[typeStyle(t, z.meta), { color: t.colors.textSecondary }, styles.description]} numberOfLines={1}>
            {entries.length ? entries.map(([, v]) => asText(v)).slice(0, 2).join(' · ') : (pending.description ?? riskLabel)}
          </Text>
        ) : pending.description ? (
          <Text style={[typeStyle(t, z.body), { color: t.colors.textSecondary }, styles.description]}>{pending.description}</Text>
        ) : null}
      </View>
    </View>
  )

  const sep = s.skin === 'pop' ? t.colors.hairlineStrong : t.colors.hairline
  const field = ([k, v]: [string, unknown], i: number) => {
    const label = fieldLabels?.[k] ?? humanize(k)
    const text = draft[k] ?? asText(v)
    const onChangeText = (x: string) => setDraft((d) => ({ ...d, [k]: x }))
    if (renderField) return <View key={k}>{renderField({ name: k, label, value: v, text, editing, onChangeText })}</View>
    return (
      <View key={k} style={[{ flexDirection: 'row', alignItems: editing ? 'center' : 'flex-start', gap: 12, paddingHorizontal: z.pad - 2, paddingVertical: editing ? z.rowPad - 3 : z.rowPad, borderTopWidth: i ? hairlineWidth : 0, borderTopColor: sep }, styles.field]}>
        <Text style={[typeStyle(t, z.body), { color: t.colors.textTertiary, width: z.label }, styles.fieldLabel]} numberOfLines={1}>
          {label}
        </Text>
        {editing ? (
          <SkinWell radius={8} style={[{ flex: 1 }, wells ? null : { borderRadius: 8, backgroundColor: t.colors.input, borderWidth: hairlineWidth, borderColor: t.colors.hairlineStrong }]}>
            <TextInput
              value={text}
              accessibilityLabel={label}
              onChangeText={onChangeText}
              selectionColor={s.tint}
              style={[typeStyle(t, z.body), { color: t.colors.text, paddingHorizontal: 8, paddingVertical: 6 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            />
          </SkinWell>
        ) : (
          <Text style={[typeStyle(t, z.body), { color: t.colors.text, flex: 1 }, styles.fieldValue]} numberOfLines={3}>
            {asText(v)}
          </Text>
        )}
      </View>
    )
  }
  const fields = entries.length ? (
    <Surface elevation="inset" radius={Math.max(8, s.radius.inset)} style={[{ overflow: 'hidden', paddingVertical: 2 }, styles.fields]}>
      {entries.map(field)}
    </Surface>
  ) : null

  const actions = (compact: boolean) =>
    renderActions ? (
      renderActions({ approve, deny, risk: pending.risk, canEdit, editing, toggleEdit })
    ) : (
      // Faces line up at the top; a pop primary key has a taller side than the secondary one.
      <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, styles.actions]}>
        {canEdit && !compact ? (
          <Button title={editing ? labels.editDone : labels.edit} variant="ghost" size={z.key} icon={keyIcon(editing ? icons.editDone : icons.edit, editing ? Check : Pencil)} onPress={toggleEdit} style={{ marginLeft: -8 }} />
        ) : null}
        {compact ? null : <View style={{ flex: 1 }} />}
        <Button title={labels.deny} variant="outline" size={z.key} icon={keyIcon(icons.deny)} onPress={deny} />
        <Button title={labels.confirm} variant="solid" size={z.key} icon={keyIcon(icons.confirm)} onPress={approve} />
      </View>
    )

  const body = (
    <View style={{ gap: z.gap + 2 }}>
      {header(false)}
      {fields}
      {actions(false)}
    </View>
  )
  const cardRadius = radius ?? (s.skin === 'clean' ? t.radii.xl - 2 : s.radius.container - 2)

  if (presentation === 'sheet') {
    return (
      <Sheet open onClose={deny} presentation="sheet" inline testID={testID} style={styles.card}>
        <View style={[{ paddingHorizontal: z.pad + 6, paddingTop: 12, gap: 14 }, style, styles.container]}>
          {showTrace ? trace : null}
          {body}
        </View>
      </Sheet>
    )
  }
  if (presentation === 'banner') {
    return (
      <Animated.View style={[liftStyle, style, styles.container]} testID={testID} accessibilityRole="alert">
        <Surface elevation="floating" radius={radius ?? Math.min(cardRadius, 18)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: z.pad - 4, paddingLeft: z.pad - 4, paddingRight: z.pad - 4 }, styles.card]}>
          {header(true)}
          {actions(true)}
        </Surface>
      </Animated.View>
    )
  }
  return (
    <Animated.View testID={testID} accessibilityRole="alert" style={[{ gap: 10 }, liftStyle, style, styles.container]}>
      {presentation === 'card' && showTrace ? trace : null}
      <Surface elevation="card" radius={cardRadius} style={[{ padding: z.pad }, styles.card]}>
        {body}
      </Surface>
    </Animated.View>
  )
}

/**
 * The icon tile: the variant's own tile in the expressive looks (a keycap, a sweet, a chrome cap, frosted
 * glass); a soft square in the quiet ones, red-tinted for a risky call.
 */
function Tile({ size, danger, children }: { size: number; danger?: boolean; children: ReactNode }) {
  const t = useTheme()
  const s = useSkin()
  if (children === null || children === undefined || children === false) return null
  if (skinHasWells(s.skin)) return <SkinTile size={size}>{children}</SkinTile>
  const minimal = s.skin === 'minimal'
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: minimal ? 'transparent' : danger ? t.colors.dangerSoft : t.colors.muted,
        borderWidth: minimal ? hairlineWidth : 0,
        borderColor: t.colors.hairlineStrong,
      }}
    >
      {children}
    </View>
  )
}

/** One step of an agent turn: an icon (on a small tile in the expressive looks) and a sentence. */
function TraceRow({ icon, z, style, children }: { icon: ReactNode; z: Z; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const s = useSkin()
  const wells = skinHasWells(s.skin)
  const box = wells ? z.icon + 8 : z.icon
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: wells ? 10 : 8, minHeight: Math.max(22, box) }, style]}>
      {icon === null ? null : wells ? <SkinTile size={box}>{icon}</SkinTile> : <View style={{ width: box, alignItems: 'center' }}>{icon}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  )
}

const line = StyleSheet.create({ wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6, rowGap: 2 } })

export default ToolConfirmCard
