export const sampleThread = `Hi team, quick update before Friday. Sam confirmed the venue for Friday at noon; parking is limited so please carpool if you can. Priya sent the revised Q4 budget this morning: marketing is down 8%, headcount stays flat, and the hardware line moved to Q1. The venue needs a final headcount by Wednesday, so reply to this thread with a yes or no. Lastly, the design review moved from Tuesday to Thursday 3pm because Jordan is out. Thanks, Alex.`

export const sampleSummaryBullets = `- Venue confirmed for Friday at noon; carpool, parking is limited
- Priya's revised Q4 budget: marketing down 8%, headcount flat, hardware moved to Q1
- Reply with a yes/no headcount by Wednesday
- Design review moved to Thursday 3pm`

export const sampleSummaryOneLine = 'Friday noon venue confirmed, revised Q4 budget shared, headcount due Wednesday, design review moved to Thursday.'

export const sampleSummaryParagraph = 'The team meets Friday at noon at the confirmed venue, where parking is limited. Priya\'s revised Q4 budget trims marketing by 8% while keeping headcount flat and shifting hardware to Q1. A final headcount is due Wednesday, and the design review now happens Thursday at 3pm.'

/** ~6× the thread, to exercise map-reduce. */
export const longDocument = Array.from({ length: 6 }, (_, i) => `Section ${i + 1}. ${sampleThread}`).join('\n\n')
