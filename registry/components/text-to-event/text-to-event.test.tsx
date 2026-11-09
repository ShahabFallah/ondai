import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { TextToEvent } from './text-to-event'
import { refineEvent } from './use-text-to-event'
import { ambiguousNow, groupAnswer, groupMessage, noEventMessage, sampleAnswer, sampleMessage, sampleNow } from './sample-data'

describe('refineEvent', () => {
  it('resolves "next Friday 8pm" on a Saturday to one day', () => {
    const r = refineEvent(sampleAnswer, sampleMessage, { now: sampleNow })
    expect(r.draft).toEqual({ title: 'Dinner with Sara', date: '2026-11-13', time: '20:00', place: 'Nonna’s', people: ['Sara'] })
    expect(r.fields.date.candidates).toBeUndefined()
    expect(r.fields.date.confidence).toBeGreaterThan(0.9)
  })
  it('offers both Fridays when "next Friday" is said on a Monday', () => {
    const r = refineEvent(sampleAnswer, sampleMessage, { now: ambiguousNow })
    expect(r.fields.date.candidates).toEqual(['2026-11-13', '2026-11-20'])
    expect(r.fields.date.confidence).toBeLessThan(0.7)
  })
  it('offers both days for "Thursday or Friday" and both readings of 05/06', () => {
    expect(refineEvent(groupAnswer, groupMessage, { now: sampleNow }).fields.date.candidates).toEqual(['2026-11-12', '2026-11-13'])
    expect(refineEvent({ title: 'Lunch', date: '05/06/2027' }, 'Lunch 05/06/2027', { now: sampleNow, dayFirst: true }).fields.date.candidates).toEqual(['2027-06-05', '2027-05-06'])
  })
  it('lowers confidence for names and places the message never says', () => {
    const r = refineEvent({ title: 'Dinner', date: 'tomorrow', place: 'The Ritz', people: ['Sara', 'Me'] }, 'dinner with sara tomorrow', { now: sampleNow })
    expect(r.draft.people).toEqual(['Sara'])
    expect(r.fields.place.confidence).toBeLessThan(0.7)
    expect(r.fields.people.confidence).toBeGreaterThan(0.8)
    expect(r.draft.time).toBeUndefined()
  })
})

describe('TextToEvent', () => {
  it('reads a message, fills the fields and hands the event to onAdd', async () => {
    const onAdd = jest.fn()
    await renderWithOndai(<TextToEvent message={sampleMessage} now={sampleNow} autoRun revealInterval={0} onAdd={onAdd} showBadge={false} />, { script: mockScript.object(sampleAnswer) })
    await waitFor(() => expect(screen.getByText('Dinner with Sara')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByText('Fri 13 Nov')).toBeTruthy()
    expect(screen.getByText('8:00 PM')).toBeTruthy()
    fireEvent.press(screen.getByText('Add to calendar'))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Dinner with Sara', date: '2026-11-13', time: '20:00', place: 'Nonna’s', people: ['Sara'], allDay: false })))
    await waitFor(() => expect(screen.getAllByText('Added').length).toBeGreaterThan(0))
  })
  it('asks which day an unclear date means, then adds the chosen one', async () => {
    const onAdd = jest.fn()
    await renderWithOndai(<TextToEvent message={sampleMessage} now={ambiguousNow} autoRun revealInterval={0} onAdd={onAdd} showBadge={false} />, { script: mockScript.object(sampleAnswer) })
    await waitFor(() => expect(screen.getByText('Which day did they mean?')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByText('Check the date before adding.')).toBeTruthy()
    fireEvent.press(screen.getByText('Fri 20 Nov'))
    await waitFor(() => expect(screen.queryByText('Which day did they mean?')).toBeNull())
    fireEvent.press(screen.getByText('Add to calendar'))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-11-20' })))
  })
  it('lets a row be edited', async () => {
    const onAdd = jest.fn()
    await renderWithOndai(<TextToEvent message={sampleMessage} now={sampleNow} autoRun revealInterval={0} onAdd={onAdd} showBadge={false} />, { script: mockScript.object(sampleAnswer) })
    await waitFor(() => expect(screen.getByText('Dinner with Sara')).toBeTruthy(), { timeout: 5000 })
    await fireEvent.press(screen.getByLabelText('Place: Nonna’s'))
    await fireEvent(await screen.findByLabelText('Place'), 'submitEditing', { nativeEvent: { text: 'Trattoria Nonna' } })
    await waitFor(() => expect(screen.getByText('Trattoria Nonna')).toBeTruthy())
    fireEvent.press(screen.getByText('Add to calendar'))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ place: 'Trattoria Nonna' })))
  })
  it('takes labels and a row slot', async () => {
    await renderWithOndai(
      <TextToEvent message={sampleMessage} now={sampleNow} autoRun revealInterval={0} showBadge={false} labels={{ addToCalendar: 'Aggiungi', title: 'Titolo' }} renderRow={({ label, value }) => <Text>{`${label}=${value}`}</Text>} />,
      { script: mockScript.object(sampleAnswer) },
    )
    await waitFor(() => expect(screen.getByText('Titolo=Dinner with Sara')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByText('Aggiungi')).toBeTruthy()
  })
  it('says when there is no event', async () => {
    await renderWithOndai(<TextToEvent message={noEventMessage} autoRun showBadge={false} />, { script: mockScript.object({}) })
    await waitFor(() => expect(screen.getByText('No event in this message')).toBeTruthy(), { timeout: 4000 })
  })
  it('says when the model refuses, without a retry', async () => {
    await renderWithOndai(<TextToEvent message={sampleMessage} autoRun showBadge={false} />, { script: mockScript.refusal() })
    await waitFor(() => expect(screen.getByText('The on-device model wouldn’t read this message.')).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByText('Try again')).toBeNull()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(
      <>
        <TextToEvent variant={variant} message={sampleMessage} showBadge={false} tint="#3B82F6" />
        <TextToEvent variant={variant} presentation="message" size="lg" message={sampleMessage} showBadge={false} />
      </>,
    )
    expect(screen.getAllByText('Find event')).toHaveLength(2)
  })
})
