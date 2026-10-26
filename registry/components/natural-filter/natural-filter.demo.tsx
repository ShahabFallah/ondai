import { useState } from 'react'
import { Text, View } from 'react-native'
import type { z } from 'zod'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import { NaturalFilter, type NaturalFilterProps } from './natural-filter'
import { restaurantAliases, restaurantFilterSchema, sampleRestaurants } from './sample-data'

type F = Partial<z.infer<typeof restaurantFilterSchema>>

export function NaturalFilterDemo(props: Omit<NaturalFilterProps<typeof restaurantFilterSchema>, 'schema'>) {
  const t = useTheme()
  const [filter, setFilter] = useState<F>({})
  const rows = sampleRestaurants
    .filter((r) => (!filter.cuisine || r.cuisine === filter.cuisine) && (!filter.price || r.price === filter.price) && (!filter.openNow || r.open) && (!filter.maxDistanceKm || r.km <= filter.maxDistanceKm) && (!filter.minRating || r.rating >= filter.minRating))
    .sort((a, b) => (filter.sort === 'distance' ? a.km - b.km : filter.sort === 'price' ? a.price.length - b.price.length : b.rating - a.rating))
  return (
    <NaturalFilter {...props} schema={restaurantFilterSchema} aliases={restaurantAliases} onChange={setFilter} instructions="Restaurant search.">
      <View style={{ gap: 6, marginTop: 4 }}>
        {rows.map((r) => (
          <View key={r.name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: hairlineWidth, borderBottomColor: t.colors.hairline }}>
            <View>
              <Text style={[typeStyle(t, 'md'), { color: t.colors.text }]}>{r.name}</Text>
              <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{`${r.cuisine} · ${r.price} · ${r.km} km${r.open ? '' : ' · closed'}`}</Text>
            </View>
            <Text style={[typeStyle(t, 'sm', { mono: true }), { color: t.colors.textSecondary }]}>{r.rating.toFixed(1)}</Text>
          </View>
        ))}
        {!rows.length ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary }]}>No matches.</Text> : null}
      </View>
    </NaturalFilter>
  )
}
