import { redirect } from 'next/navigation'

// The theme studio is retired; theming is documented in the docs.
export default function ThemesPage() {
  redirect('/docs/theming')
}
