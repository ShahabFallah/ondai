'use client'
import { useState } from 'react'

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(command)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="group flex items-center gap-3 rounded-[10px] bg-[color:var(--ondai-surface)] px-4 py-2.5 font-mono text-[14px] text-[color:var(--ondai-text)] shadow-[inset_0_0_0_1px_var(--ondai-hairline)] transition-colors hover:bg-[color:var(--ondai-elevated)]"
    >
      <span aria-hidden className="text-[color:var(--ondai-text-tertiary)]">$</span>
      <span>{command}</span>
      <span className="ml-2 font-sans text-[12px] text-[color:var(--ondai-text-tertiary)] group-hover:text-[color:var(--ondai-text-secondary)]">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
