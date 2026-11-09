import { useState } from 'react'
import { Text, View } from 'react-native'
import { Star, UtensilsCrossed } from 'lucide-react-native'
import type { z } from 'zod'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { NaturalFilter, NaturalFilterRow, type NaturalFilterProps } from './natural-filter'
import { restaurantAliases, restaurantFilterSchema, sampleRestaurants } from './sample-data'

type F = Partial<z.infer<typeof restaurantFilterSchema>>

const fieldLabels = { cuisine: 'Cuisine', price: 'Price', openNow: 'Open now', maxDistanceKm: 'Within', minRating: 'Rating', sort: 'Sort' }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const prices: Record<string, string> = { $: 'Cheap', $$: 'Mid-range', $$$: 'Fancy' }
const sorts: Record<string, string> = { rating: 'Best rated', distance: 'Closest', price: 'Cheapest' }
const format = (key: string, v: unknown) =>
  key === 'maxDistanceKm' ? `Within ${v} km` : key === 'minRating' ? `${v}+ stars` : key === 'sort' ? (sorts[String(v)] ?? cap(String(v))) : key === 'price' ? (prices[String(v)] ?? String(v)) : typeof v === 'string' ? cap(v) : String(v)

function Rating({ value }: { value: number }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Star size={12} strokeWidth={1.75} color={t.colors.textTertiary} />
      <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary, fontVariant: ['tabular-nums'] }]}>{value.toFixed(1)}</Text>
    </View>
  )
}

export function NaturalFilterDemo({ icons, ...props }: Omit<NaturalFilterProps<typeof restaurantFilterSchema>, 'schema'>) {
  const [filter, setFilter] = useState<F>({})
  const rows = sampleRestaurants
    .filter((r) => (!filter.cuisine || r.cuisine === filter.cuisine) && (!filter.price || r.price === filter.price) && (!filter.openNow || r.open) && (!filter.maxDistanceKm || r.km <= filter.maxDistanceKm) && (!filter.minRating || r.rating >= filter.minRating))
    .sort((a, b) => (filter.sort === 'distance' ? a.km - b.km : filter.sort === 'price' ? a.price.length - b.price.length : b.rating - a.rating))
  return (
    <NaturalFilter
      {...props}
      icons={{ row: UtensilsCrossed, ...icons }}
      schema={restaurantFilterSchema}
      aliases={restaurantAliases}
      fieldLabels={fieldLabels}
      format={format}
      onChange={setFilter}
      instructions="Restaurant search."
      resultCount={rows.length}
    >
      {rows.map((r) => (
        <NaturalFilterRow key={r.name} title={r.name} description={`${cap(r.cuisine)} · ${r.price} · ${r.km} km${r.open ? '' : ' · Closed'}`} trailing={<Rating value={r.rating} />} onPress={() => {}} />
      ))}
    </NaturalFilter>
  )
}
