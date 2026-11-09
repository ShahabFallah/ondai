import { useState } from 'react'
import { Text, View } from 'react-native'
import { Archive } from 'lucide-react-native'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Sheet, type SheetProps } from './sheet'

const mail = [
  { from: 'Priya Natarajan', subject: 'Revised budget for Q4', time: '9:41' },
  { from: 'Northwind Weekly', subject: 'Five ideas for your Friday', time: '8:12' },
  { from: 'Marco Bianchi', subject: 'Dinner on Saturday?', time: 'Yesterday' },
  { from: 'Receipts', subject: 'Your order has shipped', time: 'Yesterday' },
  { from: 'Lena Fischer', subject: 'Slides for Monday', time: 'Mon' },
]

export function SheetDemo({ presentation, variant, open: initialOpen = true }: Pick<SheetProps, 'presentation' | 'variant'> & { open?: boolean }) {
  const t = useTheme()
  const [open, setOpen] = useState(initialOpen)
  return (
    <View style={{ height: 520, overflow: 'hidden', backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 4 }}>
        <Text style={[typeStyle(t, 'xl', { weight: 'semibold' }), { color: t.colors.text }]}>Inbox</Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>12 unread</Text>
      </View>
      <View style={{ marginTop: 12 }}>
        {mail.map((m, i) => (
          <View key={m.from} style={{ paddingHorizontal: 20, paddingVertical: 12, gap: 2, borderTopWidth: i ? hairlineWidth : 0, borderTopColor: t.colors.hairline }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text numberOfLines={1} style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text, flex: 1 }]}>{m.from}</Text>
              <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{m.time}</Text>
            </View>
            <Text numberOfLines={1} style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{m.subject}</Text>
          </View>
        ))}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, alignItems: 'flex-start' }}>
          <Button title="Tidy up" variant="outline" size="sm" onPress={() => setOpen(true)} />
        </View>
      </View>
      <Sheet open={open} onClose={() => setOpen(false)} presentation={presentation} variant={variant} inline>
        <View style={{ paddingHorizontal: 20, paddingTop: presentation === 'sheet' ? 12 : 20, paddingBottom: presentation === 'sheet' ? 4 : 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: t.colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Archive size={18} strokeWidth={1.75} color={t.colors.text} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typeStyle(t, 'md', { weight: 'semibold' }), { color: t.colors.text }]}>Archive 9 newsletters?</Text>
              <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>They have been sitting unread for a week. You can find them in Archive.</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Not now" variant="outline" style={{ flex: 1 }} onPress={() => setOpen(false)} />
            <Button title="Archive" variant="solid" style={{ flex: 1 }} onPress={() => setOpen(false)} />
          </View>
        </View>
      </Sheet>
    </View>
  )
}
