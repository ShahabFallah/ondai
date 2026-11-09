export const samplePageTitle = 'Harbor Street Apartments · Lease summary'

export const samplePage = `Rent is $1,850 a month and is due on the 1st. Payments that arrive after the 5th carry a $75 late fee.

Pets are welcome: one cat or one dog under 25 lb per unit, with a $300 refundable pet deposit. Aquariums over 20 gallons need written approval.

The lease runs for 12 months. To move out at the end of the term, give 60 days' written notice; ending the lease early costs one month's rent.

Maintenance requests go through the resident app and are answered within 48 hours. For a leak or no heat, call the emergency line at any hour.

Quiet hours are 10pm to 7am. Each unit has one parking space in the garage; guest parking is on the street.`

export const sampleQuestion = 'Can I have a cat?'

/** The reply in the format the prompt asks for, quoting the page word for word. */
export const sampleReply = `ANSWER: Yes. You can keep one cat (or one dog under 25 lb) per unit, as long as you pay a $300 pet deposit, which you get back.
QUOTE: one cat or one dog under 25 lb per unit
QUOTE: $300 refundable pet deposit
FOLLOW: Do I need approval for an aquarium?
FOLLOW: How much is the late fee?`

export const sampleMissingQuestion = 'Is there a gym in the building?'

export const sampleSuggestions = ['When is rent due?', 'Can I have a cat?', 'How do I move out?']

/** ~8× the page, to exercise the excerpt for long pages. */
export const longPage = Array.from({ length: 8 }, (_, i) => `Section ${i + 1}.\n\n${samplePage}`).join('\n\n')
