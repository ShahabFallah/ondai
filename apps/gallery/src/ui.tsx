import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import type { FontSizeKey } from '@ondai/tokens'

export function Screen({ children, title, subtitle, scroll = true }: { children: ReactNode; title?: string; subtitle?: string; scroll?: boolean }) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const header = title ? (
    <View style={{ paddingTop: insets.top + t.spacing[4], paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4], gap: 4 }}>
      <Text style={[typeStyle(t, '3xl', { weight: 'semibold' }), { color: t.colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[typeStyle(t, 'md'), { color: t.colors.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  ) : (
    <View style={{ height: insets.top }} />
  )
  if (!scroll)
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        {header}
        {children}
      </View>
    )
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.colors.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
      {header}
      <View style={{ paddingHorizontal: t.spacing[5], gap: t.spacing[4] }}>{children}</View>
    </ScrollView>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  return (
    <View style={[{ backgroundColor: t.colors.surface, borderRadius: t.radii.lg, borderWidth: hairlineWidth, borderColor: t.colors.hairline, padding: t.spacing[4], gap: t.spacing[3] }, style]}>
      {children}
    </View>
  )
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme()
  return <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary }, style]}>{children}</Text>
}

export function Body({ children, size = 'md', color, style }: { children: ReactNode; size?: FontSizeKey; color?: string; style?: StyleProp<TextStyle> }) {
  const t = useTheme()
  return <Text style={[typeStyle(t, size), { color: color ?? t.colors.text }, style]}>{children}</Text>
}

export function Mono({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const t = useTheme()
  return <Text style={[typeStyle(t, 'sm', { mono: true }), { color: color ?? t.colors.textSecondary }, style]}>{children}</Text>
}

export function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 28 }}>
      <Label>{label}</Label>
      <Mono color={valueColor ?? t.colors.text} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Mono>
    </View>
  )
}

export function Button({ title, onPress, tone = 'solid', disabled }: { title: string; onPress: () => void; tone?: 'solid' | 'outline' | 'ghost'; disabled?: boolean }) {
  const t = useTheme()
  const bg = tone === 'solid' ? t.colors.text : 'transparent'
  const fg = tone === 'solid' ? t.colors.bg : t.colors.text
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: t.spacing[4],
        borderRadius: t.radii.md,
        backgroundColor: bg,
        borderWidth: tone === 'outline' ? hairlineWidth : 0,
        borderColor: t.colors.hairlineStrong,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: fg }]}>{title}</Text>
    </Pressable>
  )
}

export function Segmented<T extends string>({ options, value, onChange, format }: { options: readonly T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.colors.input, borderRadius: t.radii.md, padding: 2 }}>
      {options.map((o) => {
        const on = o === value
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={{ flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: t.radii.sm, backgroundColor: on ? t.colors.elevated : 'transparent' }}>
            <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: on ? t.colors.text : t.colors.textTertiary }]}>{format ? format(o) : o}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
