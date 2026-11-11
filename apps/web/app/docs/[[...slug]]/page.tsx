import { aiComponents } from '@/lib/ai-components';
import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { SidebarTrigger } from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { Menu } from 'lucide-react';
import { getMDXComponents } from '@/components/mdx';
import { RunsOn } from '@/components/docs/RunsOn';
import { ComponentIndex } from '@/components/docs/ComponentIndex';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getPageMarkdownUrl } from '@/lib/shared';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  // No mobile "On this page" bar: it sat under the nav and changed its label while scrolling.
  return (
    <DocsPage toc={page.data.toc} full={page.data.full} tableOfContentPopover={{ enabled: false }}>
      <div className="md:hidden">
        <SidebarTrigger className="btn btn-secondary btn-sm">
          <Menu size={14} />
          Browse docs
        </SidebarTrigger>
      </div>
      <DocsTitle className="docs-title">{page.data.title}</DocsTitle>
      <DocsDescription className="docs-lead mb-0">{page.data.description}</DocsDescription>
      <div className="docs-actions flex flex-row items-center gap-2 pb-4">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
            RunsOn,
            ComponentIndex,
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

function ogImageFor(slug: string[] | undefined) {
  const name = slug?.[0] === 'components' ? slug[1] : undefined
  return name && aiComponents.some((m) => m.name === name) ? `/og/${name}.jpg` : '/og/site.jpg'
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    // A component page previews with its own card (scripts/render-og.mjs); every other page with the site's.
    openGraph: { images: [{ url: ogImageFor(params.slug), width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', images: [ogImageFor(params.slug)] },
  };
}
