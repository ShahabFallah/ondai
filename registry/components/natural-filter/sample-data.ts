import { z } from 'zod'

export const restaurantFilterSchema = z.object({
  cuisine: z.enum(['italian', 'japanese', 'mexican', 'indian', 'thai', 'american']).optional(),
  price: z.enum(['$', '$$', '$$$']).optional(),
  openNow: z.boolean().optional(),
  maxDistanceKm: z.number().optional(),
  minRating: z.number().optional(),
  sort: z.enum(['rating', 'distance', 'price']).optional(),
})

export const restaurantAliases = { cuisine: { italian: ['pizza', 'pasta', 'trattoria'], japanese: ['sushi', 'ramen'], mexican: ['tacos', 'burrito'] }, price: { $: ['cheap', 'budget', 'inexpensive'], $$$: ['fancy', 'expensive', 'upscale'] } }

export const sampleQuery = 'cheap italian open now within 2 km, best rated first'
export const sampleFilterAnswer = { cuisine: 'Italian', price: 'cheap', openNow: true, maxDistanceKm: '2km', sort: 'rating' }

export const sampleRestaurants = [
  { name: "Luigi's Trattoria", cuisine: 'italian', price: '$', rating: 4.6, km: 0.8, open: true },
  { name: 'Osteria Nova', cuisine: 'italian', price: '$$', rating: 4.8, km: 1.4, open: true },
  { name: 'Ramen Ya', cuisine: 'japanese', price: '$$', rating: 4.5, km: 0.5, open: false },
  { name: 'Pizza al Taglio', cuisine: 'italian', price: '$', rating: 4.2, km: 1.9, open: true },
]
