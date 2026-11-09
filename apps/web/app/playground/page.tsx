import { redirect } from 'next/navigation'

// The playground is retired: the components run on the phone's own model, which a web page cannot
// show. Its index now lives in the docs. `/playground/<name>?embed=1` stays: docs previews iframe it.
export default function PlaygroundIndex() {
  redirect('/docs/components')
}
