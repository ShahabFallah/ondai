import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { PhotoCaption } from './photo-caption'
import { parseCaption } from './prompts'
import { sampleAlt, sampleCaption, samplePhoto, sampleReplies } from './sample-data'

describe('parseCaption', () => {
  it('splits a full reply and cleans the alt text', () => {
    expect(parseCaption('Caption: "A moon over hills."\nAlt: Image of a moon above hills.')).toEqual({ caption: 'A moon over hills.', alt: 'A moon above hills.', writing: 'alt' })
  })
  it('keeps a half-typed label out of the alt text while streaming', () => {
    expect(parseCaption('Caption: A moon over hills.\nAl')).toMatchObject({ caption: 'A moon over hills.', alt: '', writing: 'caption' })
  })
  it('reads an unlabelled two-line reply', () => {
    expect(parseCaption('A moon over hills.\nA pale moon above purple hills.')).toMatchObject({ caption: 'A moon over hills.', alt: 'A pale moon above purple hills.' })
  })
})

describe('PhotoCaption', () => {
  it('streams a caption and alt text and hands the alt text to onUseAlt', async () => {
    const onUseAlt = jest.fn()
    await renderWithOndai(<PhotoCaption image={samplePhoto} onUseAlt={onUseAlt} showBadge={false} />, { script: mockScript.text(sampleReplies.plain) })
    await waitFor(() => expect(screen.getByDisplayValue(sampleCaption)).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByDisplayValue(sampleAlt)).toBeTruthy()
    await fireEvent.press(screen.getByText('Use as alt text'))
    expect(onUseAlt).toHaveBeenCalledWith(sampleAlt)
    expect(screen.getByText('Alt text set')).toBeTruthy()
  })
  it('lets the user edit the alt text before using it', async () => {
    const onUseAlt = jest.fn()
    await renderWithOndai(<PhotoCaption image={samplePhoto} onUseAlt={onUseAlt} showBadge={false} />, { script: mockScript.text(sampleReplies.plain) })
    await waitFor(() => expect(screen.getByDisplayValue(sampleAlt)).toBeTruthy(), { timeout: 5000 })
    await fireEvent.changeText(screen.getByDisplayValue(sampleAlt), 'A full moon over purple hills.')
    await fireEvent.press(screen.getByText('Use as alt text'))
    expect(onUseAlt).toHaveBeenCalledWith('A full moon over purple hills.')
  })
  it('shows one output at a time with tabs', async () => {
    await renderWithOndai(<PhotoCaption image={samplePhoto} presentation="tabs" showBadge={false} />, { script: mockScript.text(sampleReplies.plain) })
    await waitFor(() => expect(screen.getByText('Use as alt text')).toBeTruthy(), { timeout: 5000 })
    await fireEvent.press(screen.getByText('Alt text'))
    expect(screen.getByDisplayValue(sampleAlt)).toBeTruthy()
    expect(screen.queryByDisplayValue(sampleCaption)).toBeNull()
    await fireEvent.press(screen.getByText('Caption'))
    expect(screen.getByDisplayValue(sampleCaption)).toBeTruthy()
    expect(screen.queryByDisplayValue(sampleAlt)).toBeNull()
  })
  it('shows a calm refusal without a retry key', async () => {
    await renderWithOndai(<PhotoCaption image={samplePhoto} showBadge={false} />, { script: mockScript.refusal() })
    await waitFor(() => expect(screen.getByText(/declined/)).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByText('Try again')).toBeNull()
  })
  it('offers a retry after an error', async () => {
    await renderWithOndai(<PhotoCaption image={samplePhoto} showBadge={false} />, { script: mockScript.error('unknown', 'boom') })
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy(), { timeout: 4000 })
  })
  it('renders the unavailable state when no vision model is ready', async () => {
    await renderWithOndai(<PhotoCaption image={samplePhoto} showBadge={false} />, { availability: { status: 'unavailable', reason: 'device-not-eligible' } })
    await waitFor(() => expect(screen.getByText(/not supported/)).toBeTruthy())
  })
  it('takes labels and a field slot, and waits for the describe key without autoRun', async () => {
    await renderWithOndai(<PhotoCaption image={samplePhoto} autoRun={false} showBadge={false} labels={{ run: 'Go' }} renderField={({ label, value }) => <Text>{`${label}=${value}`}</Text>} />, {
      script: mockScript.text(sampleReplies.plain),
    })
    await fireEvent.press(screen.getByText('Go'))
    await waitFor(() => expect(screen.getByText(`Caption=${sampleCaption}`)).toBeTruthy(), { timeout: 5000 })
  })
  it('asks for a photo when there is none', async () => {
    await renderWithOndai(<PhotoCaption showBadge={false} />)
    expect(screen.getByText('Add a photo')).toBeTruthy()
    expect(screen.getByText('Choose photo')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<PhotoCaption variant={variant} image={samplePhoto} autoRun={false} showBadge={false} tint="#3B82F6" />)
    expect(screen.getByText('Describe photo')).toBeTruthy()
  })
})
