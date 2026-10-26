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
      className="group flex items-center gap-3 rounded-[12px] ondai-hairline bg-[color:var(--ondai-surface)] px-4 py-3 font-mono text-[14px] text-[color:var(--ondai-text)]"
      aria-label={`Copy ${command}`}
    >
      <span className="text-[color:var(--ondai-text-tertiary)]">$</span>
      <span>{command}</span>
      <span className="ondai-mono ml-2 text-[color:var(--ondai-text-tertiary)] group-hover:text-[color:var(--ondai-text-secondary)]">{copied ? 'copied' : 'copy'}</span>
    </button>
  )
}
