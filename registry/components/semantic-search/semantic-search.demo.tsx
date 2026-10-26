import { SemanticSearch, type SemanticSearchProps } from './semantic-search'
import { sampleNotes } from './sample-data'

export function SemanticSearchDemo(props: Omit<SemanticSearchProps<{ kind: string; date: string }>, 'items'>) {
  return <SemanticSearch {...props} items={sampleNotes} groupBy={(h) => h.metadata?.kind ?? 'other'} />
}
