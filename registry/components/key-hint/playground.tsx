import { definePlayground, select, text } from '@ondai/playground'
import { KeyHint } from './key-hint'

export default definePlayground({
  name: 'key-hint',
  title: 'KeyHint',
  category: 'primitive',
  description: 'Mono key caps for keyboard hints.',
  component: KeyHint,
  controls: {
    variant: select(['caps', 'plain'], 'caps', 'Variant'),
    size: select(['sm', 'md'], 'md', 'Size'),
    keys: text('cmd K', 'Keys (space separated)'),
  },
  variantKeys: ['variant', 'size'],
  states: { default: {}, enter: { props: { keys: 'enter' } }, escape: { props: { keys: 'esc' } } },
  review: ['default', 'escape'],
  frame: { width: 200, padding: 24, background: 'bg' },
  render: (props) => <KeyHint variant={props.variant} size={props.size} keys={String(props.keys).split(/\s+/).filter(Boolean)} />,
})
