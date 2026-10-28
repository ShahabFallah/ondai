import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Callout as FdCallout } from 'fumadocs-ui/components/callout'
import type { ComponentProps } from 'react'
import type { MDXComponents } from 'mdx/types'
import { ComponentPreview } from './docs/ComponentPreview'

/** Tables scroll inside a rounded frame; styled by components/docs/docs.css (.docs-table). */
function Table(props: ComponentProps<'table'>) {
  return (
    <div className="docs-table" tabIndex={0}>
      <table {...props} />
    </div>
  )
}

function Callout({ className, ...props }: ComponentProps<typeof FdCallout>) {
  return <FdCallout {...props} className={className ? `docs-callout ${className}` : 'docs-callout'} />
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    table: Table,
    Callout,
    ComponentPreview,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
