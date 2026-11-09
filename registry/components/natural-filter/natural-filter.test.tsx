import { screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { NaturalFilter, NaturalFilterRow } from './natural-filter'
import { restaurantAliases, restaurantFilterSchema, sampleFilterAnswer, sampleQuery } from './sample-data'

describe('NaturalFilter', () => {
  it('turns a request into chips', async () => {
    await renderWithOndai(<NaturalFilter schema={restaurantFilterSchema} aliases={restaurantAliases} fieldLabels={{ openNow: 'Open now' }} initialQuery={sampleQuery} autoRun showBadge={false} />, { script: mockScript.object(sampleFilterAnswer) })
    await waitFor(() => expect(screen.getByText('Open now')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText('Cuisine: italian')).toBeTruthy()
  })
  it('takes labels, a chip slot and rows', async () => {
    await renderWithOndai(
      <NaturalFilter
        schema={restaurantFilterSchema}
        aliases={restaurantAliases}
        initialQuery={sampleQuery}
        autoRun
        showBadge={false}
        labels={{ placeholder: 'Describe it', inputLabel: 'Find', submit: 'Go' }}
        renderChip={({ chip }) => <Text>{`chip:${chip.key}`}</Text>}
        resultCount={1}
      >
        <NaturalFilterRow title="Luigi's Trattoria" description="Italian" meta="4.6" />
      </NaturalFilter>,
      { script: mockScript.object(sampleFilterAnswer) },
    )
    expect(screen.getByPlaceholderText('Describe it')).toBeTruthy()
    expect(screen.getByLabelText('Find')).toBeTruthy()
    expect(screen.getByLabelText('Go')).toBeTruthy()
    expect(screen.getByText("Luigi's Trattoria")).toBeTruthy()
    expect(screen.getByText('1 result')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('chip:cuisine')).toBeTruthy(), { timeout: 4000 })
  })
  it('shows the empty state when the filter leaves nothing', async () => {
    await renderWithOndai(
      <NaturalFilter schema={restaurantFilterSchema} showBadge={false} resultCount={0} renderEmpty={() => <Text>nothing here</Text>}>
        <Text>rows</Text>
      </NaturalFilter>,
    )
    expect(screen.getByText('nothing here')).toBeTruthy()
    expect(screen.queryByText('rows')).toBeNull()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<NaturalFilter schema={restaurantFilterSchema} variant={variant} fieldLabels={{ openNow: 'Open now' }} value={{ cuisine: 'italian', openNow: true }} showBadge={false} />)
    expect(screen.getByText('Open now')).toBeTruthy()
  })
})
