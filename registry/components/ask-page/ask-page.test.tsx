import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { AskPage } from './ask-page'
import { locateQuote, NOT_IN_PAGE, parseAnswer } from './prompts'
import { samplePage, sampleQuestion, sampleReply } from './sample-data'

describe('AskPage', () => {
  it('streams an answer with grounded quotes that jump to the page', async () => {
    const onJump = jest.fn()
    await renderWithOndai(<AskPage text={samplePage} initialQuestion={sampleQuestion} autoRun showBadge={false} onJump={onJump} />, { script: mockScript.stream(sampleReply) })
    await waitFor(() => expect(screen.getByText(/You can keep one cat/)).toBeTruthy(), { timeout: 4000 })
    await waitFor(() => expect(screen.getByText('Do I need approval for an aquarium?')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByLabelText('“$300 refundable pet deposit”'))
    expect(onJump).toHaveBeenCalledWith(expect.objectContaining({ text: '$300 refundable pet deposit', start: samplePage.indexOf('$300 refundable') }), 1)
  })
  it('drops quotes that are not in the page', async () => {
    const reply = 'ANSWER: Yes, cats are fine.\nQUOTE: cats may roam the rooftop garden freely\nQUOTE: one cat or one dog under 25 lb per unit'
    await renderWithOndai(<AskPage text={samplePage} initialQuestion={sampleQuestion} autoRun showBadge={false} />, { script: mockScript.text(reply) })
    await waitFor(() => expect(screen.getByText('one cat or one dog under 25 lb per unit')).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByText(/rooftop/)).toBeNull()
  })
  it('says when the page does not hold the answer', async () => {
    await renderWithOndai(<AskPage text={samplePage} initialQuestion="Is there a gym?" autoRun showBadge={false} suggestions={['When is rent due?']} />, { script: mockScript.text(NOT_IN_PAGE) })
    await waitFor(() => expect(screen.getByText('Not in this page')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText('When is rent due?')).toBeTruthy()
  })
  it('asks a typed question and takes labels and slots', async () => {
    await renderWithOndai(
      <AskPage text={samplePage} showBadge={false} labels={{ title: 'Ask the lease', placeholder: 'Your question' }} renderQuote={({ quote, index }) => <Text>{`q${index}:${quote.text}`}</Text>} />,
      { script: mockScript.text(sampleReply) },
    )
    expect(screen.getByText('Ask the lease')).toBeTruthy()
    await fireEvent.changeText(screen.getByPlaceholderText('Your question'), sampleQuestion)
    await fireEvent.press(screen.getByLabelText('Ask'))
    await waitFor(() => expect(screen.getByText('q0:one cat or one dog under 25 lb per unit')).toBeTruthy(), { timeout: 4000 })
  })
  it('shows a calm refusal without a retry key', async () => {
    await renderWithOndai(<AskPage text={samplePage} initialQuestion={sampleQuestion} autoRun showBadge={false} />, { script: mockScript.refusal() })
    await waitFor(() => expect(screen.getByText(/declined/)).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByText('Try again')).toBeNull()
  })
  it('renders the unavailable state when no model is ready', async () => {
    await renderWithOndai(<AskPage text={samplePage} showBadge={false} />, { availability: { status: 'unavailable', reason: 'device-not-eligible' } })
    await waitFor(() => expect(screen.getByText(/not supported/)).toBeTruthy())
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<AskPage text={samplePage} variant={variant} showBadge={false} />)
    expect(screen.getByText('Ask this page')).toBeTruthy()
  })
})

describe('ask-page prompts', () => {
  it('parses the reply format and holds back a partial not-found marker', () => {
    const p = parseAnswer(sampleReply)
    expect(p.answer).toMatch(/^Yes\./)
    expect(p.quotes).toHaveLength(2)
    expect(p.followUps).toEqual(['Do I need approval for an aquarium?', 'How much is the late fee?'])
    expect(parseAnswer('NOT_IN', true)).toMatchObject({ answer: '', notFound: false })
    expect(parseAnswer('NOT_IN_PAGE').notFound).toBe(true)
    expect(parseAnswer('ANSWER: The page does not mention a gym.').notFound).toBe(true)
  })
  it('locates quotes across case and spacing, and near matches', () => {
    const exact = locateQuote(samplePage, '“Quiet hours are 10PM to 7am”')
    expect(exact).toMatchObject({ match: 'exact', text: 'Quiet hours are 10pm to 7am' })
    expect(samplePage.slice(exact!.start, exact!.end)).toBe(exact!.text)
    expect(locateQuote(samplePage, 'maintenance requests are answered within 48 hours via the resident app')?.match).toBe('near')
    expect(locateQuote(samplePage, 'a rooftop pool open all year')).toBeNull()
  })
})
