import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { TextSearch } from 'lucide-react-native'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { SemanticSearch } from './semantic-search'
import { sampleNotes } from './sample-data'

const keywordsOnly = { availability: { status: 'unavailable' as const, reason: 'device-not-eligible' as const } }

describe('SemanticSearch', () => {
  it('falls back to keywords and shows why a result matched', async () => {
    await renderWithOndai(<SemanticSearch items={sampleNotes} initialQuery="lasagna" autoRun showBadge={false} />, keywordsOnly)
    await waitFor(() => expect(screen.getByText('Matches “lasagna”')).toBeTruthy())
    expect(screen.getByText(/Keywords only/)).toBeTruthy()
  })
  it('takes labels, icons, recent searches and a result slot', async () => {
    const onSelect = jest.fn()
    await renderWithOndai(
      <SemanticSearch
        items={sampleNotes}
        showBadge={false}
        labels={{ placeholder: 'Search notes', recent: 'Lately', inputLabel: 'Notes search' }}
        icons={{ search: TextSearch, recent: null }}
        recent={['lasagna']}
        onSelect={onSelect}
        renderResult={({ hit, onPress }) => (
          <Text onPress={onPress}>{`hit:${hit.id}`}</Text>
        )}
      />,
      keywordsOnly,
    )
    expect(screen.getByPlaceholderText('Search notes')).toBeTruthy()
    expect(screen.getByText('Lately')).toBeTruthy()
    await fireEvent.press(screen.getByText('lasagna'))
    await waitFor(() => expect(screen.getByText('hit:n4')).toBeTruthy())
    await fireEvent.press(screen.getByText('hit:n4'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'n4' }))
  })
  it('shows the empty state when nothing is close', async () => {
    await renderWithOndai(<SemanticSearch items={sampleNotes} initialQuery="zzqx" autoRun showBadge={false} renderEmpty={(q) => <Text>{`none:${q}`}</Text>} />, keywordsOnly)
    await waitFor(() => expect(screen.getByText('none:zzqx')).toBeTruthy())
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<SemanticSearch items={sampleNotes} variant={variant} resultStyle="cards" showBadge={false} />, keywordsOnly)
    expect(screen.getByLabelText('Search')).toBeTruthy()
  })
})
