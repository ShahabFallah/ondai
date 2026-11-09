import { mockScript, type MockCallInfo, type ScriptSource } from '@ondai/core/mock'

/**
 * What the scripted mock answers when a visitor plays with a component on the landing page.
 * The scripts read the prompt so the answer follows what was typed; on a phone the real model does this.
 */
export interface Demo {
  /** What the mock model answers. Primitives that never call the model leave it out. */
  script?: ScriptSource
  props?: Record<string, unknown>
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clean = (s: string) =>
  s
    .replace(/^(please\s+)?(remind me to|remember to|add (a )?(task|todo)( to)?|todo:?|create (a )?task( to)?|i need to|note to self:?)\s*/i, '')
    .replace(/\b(tomorrow|today|tonight|next week|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|at \d{1,2}(:\d{2})?\s?(am|pm)?)\b.*$/i, '')
    .replace(/[.!?\s]+$/g, '')
    .trim()
const due = (q: string) => q.match(/\b(tomorrow|today|tonight|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)?.[1]
const money = (q: string) => {
  const m = q.match(/(\d+(?:[.,]\d{1,2})?)/)
  return m ? Number(m[1]!.replace(',', '.')) : undefined
}
const currency = (q: string) => (/€|\beur(os?)?\b/.test(q) ? 'EUR' : /\$|\busd\b|dollars?/.test(q) ? 'USD' : /£|\bgbp\b|pounds?/.test(q) ? 'GBP' : undefined)
const merchant = (p: string) => p.match(/\b(?:at|from|@)\s+([A-Z][\w'’]*(?:\s+[A-Z][\w'’]*)*)/)?.[1] ?? p.match(/\b(?:at|from|@)\s+([\w'’]+)/i)?.[1]
const category = (q: string) =>
  /coffee|lunch|dinner|breakfast|pizza|sushi|restaurant|grocer|food|drink|bar|cafe|café/.test(q)
    ? 'Food & drinks'
    : /uber|taxi|train|bus|fuel|gas|metro|flight|parking/.test(q)
      ? 'transport'
      : /rent|electric|ikea|furniture|home|plumber/.test(q)
        ? 'home'
        : /pharma|doctor|dentist|gym|medic/.test(q)
          ? 'health'
          : /movie|cinema|concert|game|tickets?|museum/.test(q)
            ? 'fun'
            : 'other'

// Each submit makes two model calls (pick a tool, then wrap up), so alternate per prompt.
const turns = new Map<string, number>()
const turn = (p: string) => {
  const n = turns.get(p) ?? 0
  turns.set(p, n + 1)
  return n
}

const commandBar: ScriptSource = (call: MockCallInfo) => {
  const p = call.prompt.trim()
  const q = p.toLowerCase()
  if (turn(p) % 2 === 1) return mockScript.text('Done.')
  const think = mockScript.thinking(480)
  if (/\b(e-?mail|mail|message|write to|tell)\b/.test(q)) {
    const to = q.match(/\b(?:e-?mail|mail|message|tell|to)\s+([a-z]+)/)?.[1]
    const subject = cap(clean(p.replace(/\b(e-?mail|mail|message|write to|tell)\b\s*\w*\s*(that|about)?/i, ''))) || 'Quick note'
    return think.toolCall('email_send', { to: `${to && to !== 'that' ? to : 'priya'}@example.com`, subject, body: 'Sent from the command bar.' })
  }
  if (/\b(spent|paid|cost|expense|bought)\b|[€$£]\s?\d|\d+\s?(eur|euros?|usd|dollars?|gbp|pounds?)\b/.test(q)) {
    const cat = category(q)
    return think.toolCall('expense_add', { amount: money(q) ?? 0, merchant: merchant(p) ?? 'Somewhere', category: cat === 'Food & drinks' ? 'food' : ['transport', 'home'].includes(cat) ? cat : 'other' })
  }
  if (/\b(settings?|preferences|account)\b/.test(q)) return think.toolCall('screen_settings', {})
  if (/\b(inbox|messages|mail)\b/.test(q)) return think.toolCall('screen_inbox', {})
  if (/\b(expenses|budget|spending)\b/.test(q)) return think.toolCall('screen_expenses', {})
  if (/\b(dark|light|theme|appearance)\b/.test(q)) return think.toolCall('theme_toggle', {})
  return think.toolCall('task_create', { title: cap(clean(p)) || 'New task', due: due(q) })
}

const smartInput: ScriptSource = (call: MockCallInfo) => {
  const p = call.prompt.trim()
  const q = p.toLowerCase()
  return mockScript.thinking(480).object({
    merchant: merchant(p) ?? cap(q.split(/\s+/).find((w) => w.length > 3) ?? 'Somewhere'),
    amount: money(q) ?? 0,
    currency: currency(q),
    category: category(q),
    date: due(q) ?? (/yesterday/.test(q) ? 'yesterday' : undefined),
  })
}

const summaryBullets = `- Venue confirmed for Friday at noon; carpool, parking is limited
- Priya's revised Q4 budget: marketing down 8%, headcount flat, hardware moved to Q1
- Reply with a yes/no headcount by Wednesday
- Design review moved to Thursday 3pm`
const summaryOneLine = 'Friday noon venue confirmed, revised Q4 budget shared, headcount due Wednesday, design review moved to Thursday.'
const summaryParagraph =
  "The team meets Friday at noon at the confirmed venue, where parking is limited. Priya's revised Q4 budget trims marketing by 8% while keeping headcount flat and shifting hardware to Q1. A final headcount is due Wednesday, and the design review now happens Thursday at 3pm."

const summarize: ScriptSource = (call: MockCallInfo) => {
  const s = `${call.system ?? ''} ${call.prompt}`.toLowerCase()
  const text = /one (short )?(line|sentence)/.test(s) ? summaryOneLine : /paragraph/.test(s) ? summaryParagraph : summaryBullets
  return mockScript.thinking(450).stream(text, 45)
}

const rewrites = {
  shorter: 'Hi Priya, thanks for the budget. Marketing looks low. Can we talk tomorrow before the review? Venue confirmed for Friday noon.',
  longer:
    "Hey Priya, thank you for sending over the budget. Overall it looks good to me, though the marketing line seems a little low for what we have planned. Could we find fifteen minutes tomorrow, before the review, to go through it together? Also, good news: the venue is confirmed for Friday at noon.",
  friendlier: 'Hey Priya! Thanks so much for the budget, it looks great overall. Marketing feels a bit low though. Could we chat tomorrow before the review? Also, the venue is confirmed for Friday at noon.',
  formal: 'Hi Priya, thank you for sending the budget. It looks good overall, though the marketing line seems low. Could we discuss it tomorrow before the review? The venue is confirmed for Friday at noon.',
  fixed: 'Hey Priya, got your budget. It looks good mostly, but marketing seems low. Can we talk tomorrow before the review? Also, the venue is confirmed for Friday at noon.',
}

// The short draft typed in the landing page reel, rewritten per mode.
const reelDraft: typeof rewrites = {
  shorter: 'Got the budget. Marketing looks low. Talk tomorrow?',
  longer: 'Thanks for sending the budget over. The marketing line looks a little low to me. Could we find some time tomorrow to talk it through?',
  friendlier: 'Thanks so much for the budget! Marketing looks a little low though. Could we chat tomorrow?',
  formal: 'Thank you for the budget. The marketing line looks low. Could we discuss it tomorrow?',
  fixed: 'Got your budget. Marketing looks low. Can we talk tomorrow?',
}

const rewrite: ScriptSource = (call: MockCallInfo) => {
  const s = (call.system ?? '').toLowerCase()
  const set = /marketing looks low/i.test(call.prompt) ? reelDraft : rewrites
  const text = s.includes('half as long') ? set.shorter : s.includes('more detail') ? set.longer : s.includes('friendly') ? set.friendlier : s.includes('professional') ? set.formal : set.fixed
  return mockScript.thinking(260).stream(text, 64)
}

const naturalFilter: ScriptSource = (call: MockCallInfo) => {
  const q = call.prompt.toLowerCase()
  const out: Record<string, unknown> = {}
  const cuisine = /italian|pizza|pasta|trattoria/.test(q) ? 'Italian' : /japanese|sushi|ramen/.test(q) ? 'Japanese' : /mexican|tacos?|burrito/.test(q) ? 'Mexican' : /indian|curry/.test(q) ? 'Indian' : /thai/.test(q) ? 'Thai' : /american|burger/.test(q) ? 'American' : undefined
  if (cuisine) out.cuisine = cuisine
  if (/cheap|budget|inexpensive|affordable/.test(q)) out.price = 'cheap'
  else if (/fancy|expensive|upscale|nice/.test(q)) out.price = 'expensive'
  if (/open/.test(q)) out.openNow = true
  const km = q.match(/(\d+(?:\.\d+)?)\s?(km|kilomet)/)?.[1]
  if (km) out.maxDistanceKm = Number(km)
  else if (/near|nearby|close|walk/.test(q)) out.maxDistanceKm = 1
  const rating = q.match(/(\d(?:\.\d)?)\s?(stars?|\+)/)?.[1]
  if (rating) out.minRating = Number(rating)
  // Sort only when the visitor asked for an order.
  if (/best|top|rated|rating/.test(q)) out.sort = 'rating'
  else if (/closest|nearest|by distance/.test(q)) out.sort = 'distance'
  else if (/cheapest first|by price/.test(q)) out.sort = 'price'
  return mockScript.thinking(420).object(out)
}

const replies = ["Yes, I'll bring it. A ride would be great, thanks!", "I'll bring the printout, but I'll drive myself.", 'Sure. What time would you pick me up?']
const smartReply: ScriptSource = () => mockScript.thinking(520).object({ replies })

const tagRules: Array<[RegExp, string]> = [
  [/train|flight|trip|hotel|lyon|paris|travel|airport/, 'Travel'],
  [/client|meeting|workshop|deadline|slides|review|work/, 'work stuff'],
  [/expense|invoice|budget|tickets|pay|cost|finance/, 'finances'],
  [/gym|doctor|dentist|run|sleep|health/, 'health'],
  [/recipe|cook|bake|dinner/, 'recipes'],
  [/mom|dad|kids|family|birthday/, 'family'],
  [/idea|what if|maybe we/, 'ideas'],
]
const autoTag: ScriptSource = (call: MockCallInfo) => {
  const q = call.prompt.toLowerCase()
  const tags = tagRules.filter(([re]) => re.test(q)).map(([, t]) => t)
  return mockScript.thinking(380).object({ tags: tags.length ? tags.slice(0, 3) : ['personal'] })
}

// Embeddings come from the mock's pseudo-embedding model; no script step is needed.
const semanticSearch: ScriptSource = () => mockScript.empty()

export const demos = {
  'command-bar': { script: commandBar, props: { presentation: 'inline', variant: 'solid', showKeyHints: true, autoFocus: false } },
  'smart-input': { script: smartInput, props: { presentation: 'field' } },
  summarize: { script: summarize, props: { presentation: 'card', length: 'bullets' } },
  rewrite: { script: rewrite, props: { presentation: 'toolbar', resultView: 'diff' } },
  'natural-filter': { script: naturalFilter, props: { presentation: 'inline' } },
  'smart-reply': { script: smartReply, props: { presentation: 'chips' } },
  'auto-tag': { script: autoTag, props: { presentation: 'chips' } },
  'semantic-search': { script: semanticSearch, props: { presentation: 'bar', resultStyle: 'list', initialQuery: 'trips and tickets', autoRun: true } },

  // Primitives on the "Primitives, alive" row. The last three land with the registry build.
  'thinking-indicator': { props: { variant: 'orb', size: 'lg', state: 'thinking', label: '' } },
  'ion-border': { props: { variant: 'beam', active: true, glow: true, radius: 'lg' } },
  'agent-avatar': { props: { state: 'idle', interactive: true } },
  'voice-input': { props: { visual: 'bars', stage: 'listening' } },
  'image-reveal': { props: { progress: 'auto', showSteps: true } },
  'shimmer-text': { props: { size: 'lg', active: true } },
  'border-beam': { props: { active: true } },
  'liquid-metal': { props: { active: true, preset: 'chromatic' } },
  'bot-avatar': { props: { state: 'default', size: 88 } },
} satisfies Record<string, Demo>

export type DemoName = keyof typeof demos

/** Stage settings for the landing page reels (app/capture, scripts/record-reels.mjs). */
export interface Reel {
  props?: Record<string, unknown>
  /** Pin the component to the top of the stage (it grows downward as the answer arrives). */
  align?: 'top' | 'center'
  top?: number
}
export const reels: Partial<Record<DemoName, Reel>> = {
  'command-bar': { props: { showKeyHints: false, showBadge: false, autoFocus: false }, align: 'top', top: 96 },
  'smart-input': { props: { presentation: 'field', showBadge: false, voice: false, camera: false, placeholder: 'Describe the expense' }, align: 'top', top: 48 },
  'natural-filter': { props: { presentation: 'bar', showBadge: false, placeholder: 'Search in your own words' }, align: 'top', top: 22 },
  'smart-reply': { props: { presentation: 'chips', showBadge: false, testID: 'reel-replies' }, align: 'top', top: 64 },
  rewrite: { props: { presentation: 'toolbar', resultView: 'diff', showBadge: false, value: '', modes: ['shorten', 'friendlier', 'formal'], testID: 'reel-rewrite' }, align: 'top', top: 40 },
  'auto-tag': { props: { presentation: 'chips', showBadge: false, testID: 'reel-tags' }, align: 'top', top: 64 },
}
