import { source } from '@/lib/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { SiteHeader } from '@/components/site/SiteHeader'

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <>
      <SiteHeader />
      <DocsLayout tree={source.getPageTree()} nav={{ enabled: false }} themeSwitch={{ enabled: false }} searchToggle={{ enabled: false }}>{children}</DocsLayout>
    </>
  )
}
