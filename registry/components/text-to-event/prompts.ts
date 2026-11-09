/** Short, task-shaped instructions: the model copies what the message says; dates and times are resolved on device afterwards. */
export function eventInstructions(extra?: string): string {
  return [
    'Find the one event in the message. Return JSON only with these fields:',
    'title (a short name for the event, like "Dinner with Sara"),',
    'date (the day exactly as written, like "next Friday", "12 Nov" or "tomorrow"; optional),',
    'time (the start time exactly as written, like "8pm"; optional),',
    'place (where it happens, as written; optional),',
    'people (names of the other people, not "me" or "you"; optional).',
    'Copy words from the message. Leave out anything it does not say. Never guess.',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}
