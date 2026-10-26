import type { SearchItem } from './use-semantic-search'

export const sampleNotes: SearchItem<{ kind: string; date: string }>[] = [
  { id: 'n1', text: 'Dentist appointment moved to the 14th at 9:30, bring insurance card', metadata: { kind: 'health', date: '2026-10-02' } },
  { id: 'n2', text: 'Ideas for the garden: raised beds along the fence, tomatoes and basil in May', metadata: { kind: 'home', date: '2026-04-12' } },
  { id: 'n3', text: 'Q4 budget review notes: marketing down 8%, hardware moved to Q1, headcount flat', metadata: { kind: 'work', date: '2026-10-20' } },
  { id: 'n4', text: 'Grandma\'s lasagna: béchamel first, then ragù, rest 20 minutes before cutting', metadata: { kind: 'recipes', date: '2026-02-18' } },
  { id: 'n5', text: 'Flight to Lisbon Nov 3, 07:40, seat 12A, hotel near Praça do Comércio', metadata: { kind: 'travel', date: '2026-10-21' } },
  { id: 'n6', text: 'Call the landlord about the leaking tap in the kitchen', metadata: { kind: 'home', date: '2026-10-24' } },
  { id: 'n7', text: 'Book club: finish "The Overstory" before Thursday, bring snacks', metadata: { kind: 'personal', date: '2026-10-19' } },
  { id: 'n8', text: 'Gift ideas for Sam: record player, hiking socks, that coffee grinder', metadata: { kind: 'personal', date: '2026-09-30' } },
  { id: 'n9', text: 'Design review moved to Thursday 3pm because Jordan is out', metadata: { kind: 'work', date: '2026-10-25' } },
  { id: 'n10', text: 'Running plan: 5k Tuesday, intervals Thursday, long run Sunday morning', metadata: { kind: 'health', date: '2026-10-05' } },
  { id: 'n11', text: 'Train tickets to Lyon for the client workshop, expense them', metadata: { kind: 'travel', date: '2026-10-11' } },
  { id: 'n12', text: 'Wifi password for the cabin: bluepine-2024', metadata: { kind: 'travel', date: '2026-08-02' } },
]
