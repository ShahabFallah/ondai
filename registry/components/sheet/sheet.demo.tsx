import { useState } from 'react'
import { Text, View } from 'react-native'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Sheet, type SheetProps } from './sheet'

export function SheetDemo({ presentation, variant, open: initialOpen = true }: Pick<SheetProps, 'presentation' | 'variant'> & { open?: boolean }) {
  const t = useTheme()
  const [open, setOpen] = useState(initialOpen)
  return (
    <View style={{ height: 520, borderRadius: t.radii.lg, overflow: 'hidden', backgroundColor: t.colors.bg }}>
      <View style={{ padding: 20, gap: 12 }}>
        <Text style={[typeStyle(t, 'lg', { weight: 'medium' }), { color: t.colors.text }]}>Inbox</Text>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ height: 44, borderRadius: 10, backgroundColor: t.colors.surface }} />
        ))}
        <Button title="Open" variant="soft" onPress={() => setOpen(true)} />
      </View>
      <Sheet open={open} onClose={() => setOpen(false)} presentation={presentation} variant={variant} inline>
        <View style={{ padding: 20, gap: 8 }}>
          <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]}>Sheet content</Text>
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>Springs in, fades the backdrop, respects reduce motion.</Text>
        </View>
      </Sheet>
    </View>
  )
}
