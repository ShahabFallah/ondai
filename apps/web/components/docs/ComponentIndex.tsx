import Link from 'next/link'
import { getComponentGroups } from './component-groups'
import { LoopShot } from '@/components/site/LoopShot'

/**
 * `/docs/components`: every AI component as its still, in the sidebar's order. The hover list with the spring-following preview lives in the sidebar
 * (SidebarIndex.tsx) on every docs page, so this page is the picture wall: no script, theme-aware
 * pictures switched by `.only-light` / `.only-dark`, and it reads the same on a phone.
 */
export function ComponentIndex() {
  const groups = getComponentGroups()

  return (
    <div className="not-prose ci">
      {groups.map((g) => (
        <section key={g.id} className="ci-group" aria-labelledby={`ci-${g.id}`}>
          <h2 id={`ci-${g.id}`} className="ci-group-title">
            {g.title}
          </h2>
          <ul className="ci-grid">
            {g.items.map((item) => (
              <li key={item.name}>
                <Link href={`/docs/components/${item.name}`} className="ci-card">
                  {item.thumb ? (
                    <span className="ci-still" aria-hidden="true">
                      <LoopShot name={item.name} loop={item.loop} />
                    </span>
                  ) : null}
                  <span className="ci-name">{item.title}</span>
                  <span className="ci-line">{item.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
