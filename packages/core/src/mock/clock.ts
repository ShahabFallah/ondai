export interface Clock {
  now(): number
  sleep(ms: number): Promise<void>
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
}

export interface ManualClock extends Clock {
  /** Advance time, resolving sleeps that come due (including ones queued as a result), in order. */
  advance(ms: number): Promise<void>
  /** Resolve every pending sleep (and the ones they queue) immediately. */
  flush(): Promise<void>
  /** Keep flushing until the promise settles. */
  runUntil<T>(promise: Promise<T>): Promise<T>
  pending(): number
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/** Deterministic clock for screenshots and tests: nothing resolves until you advance it. */
export function manualClock(start = 0): ManualClock {
  let t = start
  const queue: Array<{ at: number; resolve: () => void }> = []
  const runDue = async () => {
    // Loop because resolving one sleep usually queues the next one, sometimes a few ticks later.
    let idle = 0
    for (let i = 0; i < 20_000 && idle < 6; i++) {
      queue.sort((a, b) => a.at - b.at)
      const due = queue.filter((q) => q.at <= t)
      if (!due.length) {
        idle++
        await tick()
        continue
      }
      idle = 0
      for (const q of due) {
        queue.splice(queue.indexOf(q), 1)
        q.resolve()
      }
      await tick()
    }
  }
  const clock: ManualClock = {
    now: () => t,
    sleep(ms) {
      return new Promise<void>((resolve) => {
        queue.push({ at: t + Math.max(0, ms), resolve })
      })
    },
    async advance(ms) {
      // Step through time one due sleep at a time, so a sleep queued after an earlier one resolves (the next
      // token, or the next model call once a tool's promise settles) is timed from that instant, not from the end.
      const target = t + Math.max(0, ms)
      let idle = 0
      for (let i = 0; i < 20_000 && idle < 10; i++) {
        queue.sort((a, b) => a.at - b.at)
        const next = queue[0]
        if (!next || next.at > target) {
          idle++
          await tick()
          continue
        }
        idle = 0
        t = Math.max(t, next.at)
        while (queue.length && queue[0]!.at <= t) queue.shift()!.resolve()
        await tick()
      }
      t = target
    },
    async flush() {
      for (let i = 0; i < 1000; i++) {
        if (!queue.length) {
          await tick()
          if (!queue.length) break
        }
        for (const q of queue) t = Math.max(t, q.at)
        await runDue()
      }
    },
    async runUntil(promise) {
      let settled = false
      const guarded = promise.finally(() => (settled = true))
      guarded.catch(() => {})
      while (!settled) {
        await clock.flush()
        await tick()
      }
      return guarded
    },
    pending: () => queue.length,
  }
  return clock
}
