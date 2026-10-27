'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** The install command as a pill: `$ npx ondai add …`, click to copy. */
export function CopyCommand({ command, className = '' }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(command).catch(() => {})
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1500)
      }}
      aria-label={copied ? 'Copied' : `Copy ${command}`}
      className={`group inline-flex h-10 max-w-full items-center gap-3 rounded-full bg-[color:var(--hover)] pr-3 pl-4 font-mono text-[13px] text-[color:var(--ondai-text)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-[color:var(--hover-strong)] ${className}`}
    >
      <span aria-hidden className="text-[color:var(--ondai-text-tertiary)]">
        $
      </span>
      <span className="truncate">{command}</span>
      <span aria-hidden className={`ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${copied ? 'text-[color:var(--ondai-text)]' : 'text-[color:var(--ondai-text-tertiary)] group-hover:text-[color:var(--ondai-text-secondary)]'}`}>
        {copied ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
      </span>
    </button>
  )
}
