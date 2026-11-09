import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { AutoTag } from './auto-tag'
import { noteTags, sampleNote, sampleTagAnswer } from './sample-data'

const script = { script: mockScript.object(sampleTagAnswer) }

describe('AutoTag', () => {
  it('suggests tags from the list and accepts them', async () => {
    const onChange = jest.fn()
    await renderWithOndai(<AutoTag tags={noteTags} text={sampleNote} selected={[]} onChange={onChange} showBadge={false} />, script)
    await waitFor(() => expect(screen.getByLabelText('Add tag travel')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByLabelText('Add tag travel'))
    expect(onChange).toHaveBeenCalledWith(['travel'])
    await fireEvent.press(screen.getByText('Add all'))
    expect(onChange).toHaveBeenLastCalledWith(['travel', 'work', 'finance'])
  })
  it('takes labels and a tag slot', async () => {
    await renderWithOndai(
      <AutoTag tags={noteTags} text={sampleNote} selected={['travel']} onChange={() => {}} showBadge={false} labels={{ title: 'Tags', addAll: 'All' }} renderTag={({ tag, selected }) => <Text>{`${selected ? 'on' : 'off'}:${tag}`}</Text>} />,
      script,
    )
    expect(screen.getByText('Tags')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('off:work')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText('on:travel')).toBeTruthy()
    expect(screen.getByText('All')).toBeTruthy()
  })
  it('shows the empty state when nothing fits', async () => {
    await renderWithOndai(<AutoTag tags={noteTags} text={sampleNote} selected={[]} onChange={() => {}} showBadge={false} renderEmpty={() => <Text>no fit</Text>} />, { script: mockScript.object({ tags: [] }) })
    await waitFor(() => expect(screen.getByText('no fit')).toBeTruthy(), { timeout: 4000 })
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<AutoTag tags={noteTags} text={sampleNote} selected={['travel']} onChange={() => {}} variant={variant} presentation="dropdown" showBadge={false} />, script)
    expect(screen.getByText('travel')).toBeTruthy()
  })
})
