import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { gitConfig } from './shared'
import { Glyph } from '@/components/site/Glyph'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2">
          <Glyph size={18} />
          <span className="text-[15px] font-medium tracking-tight">ondai</span>
        </span>
      ),
    },
    links: [
      { text: 'Docs', url: '/docs', active: 'nested-url' },
      { text: 'Components', url: '/docs/components/command-bar', active: 'none' },
      { text: 'Playground', url: '/playground', active: 'nested-url' },
      { text: 'Review', url: '/review', active: 'nested-url' },
      { text: 'Themes', url: '/themes', active: 'nested-url' },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  }
}
