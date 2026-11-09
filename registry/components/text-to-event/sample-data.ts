/** A message a friend might send. */
export const sampleMessage = 'Are we still on for dinner with Sara next Friday? 8pm at Nonna’s, I booked a table for three.'

/** What a model copies out of it. */
export const sampleAnswer = { title: 'Dinner with Sara', date: 'next Friday', time: '8pm', place: 'Nonna’s', people: ['Sara'] }

/** Saturday 7 November 2026: "next Friday" can only be the 13th. */
export const sampleNow = new Date(2026, 10, 7, 10, 0)

/** Monday 9 November 2026: "next Friday" could be the 13th or the 20th. */
export const ambiguousNow = new Date(2026, 10, 9, 10, 0)

export const groupMessage = 'Team offsite Thursday or Friday, 9:30 at the Loft on Via Tortona. Marco, Priya and Tom are in.'
export const groupAnswer = { title: 'Team offsite', date: 'Thursday or Friday', time: '9:30', place: 'the Loft on Via Tortona', people: ['Marco', 'Priya', 'Tom'] }

export const noEventMessage = 'Thanks for yesterday, that was really fun!'
