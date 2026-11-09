import { source } from '@/lib/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getComponentGroups } from '@/components/docs/component-groups'
import { SidebarIndexItem, SidebarIndexProvider, SidebarIndexSeparator, type SidebarEntry } from '@/components/docs/SidebarIndex'
import '@/components/docs/docs.css'

// The sidebar doubles as the component index: rows, counts and preview pictures come from here.
const groups = getComponentGroups()
const entries: Record<string, SidebarEntry> = Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [i.name, { title: i.title, line: i.line, thumb: i.thumb, loop: i.loop }])))
// No counts in the sidebar: people explore the list rather than tally it.
const counts: Record<string, number> = {}

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <>
      <SiteHeader />
      <SidebarIndexProvider entries={entries} counts={counts}>
        <DocsLayout
          tree={source.getPageTree()}
          nav={{ enabled: false }}
          sidebar={{ collapsible: false, components: { Item: SidebarIndexItem, Separator: SidebarIndexSeparator } }}
          themeSwitch={{ enabled: false }}
          searchToggle={{ enabled: false }}
          containerProps={{ className: 'docs-shell' }}
        >
          {children}
        </DocsLayout>
      </SidebarIndexProvider>
    </>
  )
}
