import { z } from 'zod'
import { defineAction, defineActions } from './actions'

/** Sample actions from a notes + expenses app. Used by the playground, gallery and tests. */
export const sampleActions = defineActions([
  defineAction({
    id: 'task.create',
    title: 'Create task',
    description: 'Add a task to your list',
    keywords: ['todo', 'remind', 'add', 'new'],
    params: z.object({ title: z.string(), due: z.string().optional() }),
    preview: (p) => `Create task · ${p.title}${p.due ? ` · ${p.due}` : ''}`,
    run: (p) => `Created "${p.title}"`,
  }),
  defineAction({
    id: 'expense.add',
    title: 'Add expense',
    description: 'Log money you spent',
    keywords: ['spent', 'paid', 'cost', 'euro', 'dollar'],
    params: z.object({ amount: z.number(), merchant: z.string(), category: z.enum(['food', 'transport', 'home', 'other']).optional() }),
    preview: (p) => `Add expense · ${p.merchant} · ${p.amount}`,
    run: (p) => `Logged ${p.amount} at ${p.merchant}`,
  }),
  defineAction({
    id: 'email.send',
    title: 'Send email',
    description: 'Send a message from your account',
    keywords: ['mail', 'message', 'write'],
    risk: 'high',
    params: z.object({ to: z.string(), subject: z.string(), body: z.string().optional() }),
    preview: (p) => `Email to ${p.to} · ${p.subject}`,
    run: (p) => `Sent to ${p.to}`,
  }),
  defineAction({ id: 'screen.settings', title: 'Settings', keywords: ['preferences', 'theme', 'account'], group: 'screens', run: () => 'Opened Settings' }),
  defineAction({ id: 'screen.inbox', title: 'Inbox', keywords: ['mail', 'messages'], group: 'screens', run: () => 'Opened Inbox' }),
  defineAction({ id: 'screen.expenses', title: 'Expenses', keywords: ['money', 'budget', 'spending'], group: 'screens', run: () => 'Opened Expenses' }),
  defineAction({ id: 'item.budget-q4', title: 'Q4 budget', description: 'Spreadsheet · edited yesterday', group: 'items', keywords: ['budget', 'priya'], run: () => 'Opened Q4 budget' }),
  defineAction({ id: 'theme.toggle', title: 'Toggle dark mode', keywords: ['theme', 'light', 'dark', 'appearance'], run: () => 'Toggled theme' }),
])
