export interface DiffPart {
  type: 'equal' | 'add' | 'remove'
  text: string
}

/** Word-level diff (LCS). Small inputs only; both texts are short rewrites. */
export function wordDiff(a: string, b: string): DiffPart[] {
  const x = a.split(/(\s+)/).filter((s) => s.length)
  const y = b.split(/(\s+)/).filter((s) => s.length)
  const n = x.length
  const m = y.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i]![j] = x[i] === y[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
  const out: DiffPart[] = []
  let i = 0
  let j = 0
  const push = (type: DiffPart['type'], text: string) => {
    const last = out[out.length - 1]
    if (last && last.type === type) last.text += text
    else out.push({ type, text })
  }
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      push('equal', x[i]!)
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      push('remove', x[i]!)
      i++
    } else {
      push('add', y[j]!)
      j++
    }
  }
  while (i < n) push('remove', x[i++]!)
  while (j < m) push('add', y[j++]!)
  return out
}
