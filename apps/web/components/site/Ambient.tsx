import './ambient.css'

/**
 * The page's ground: a full-screen gradient that drifts very slowly under a blur and a fine grain,
 * so nothing ever looks static. Grey on paper in light mode, near-black in dark. Pure CSS (compositor-only
 * transforms), frozen under reduced motion.
 */
export function Ambient() {
  return (
    <div aria-hidden className="ambient">
      <span className="amb amb-1" />
      <span className="amb amb-2" />
      <span className="amb amb-3" />
      <span className="amb amb-4" />
      <span className="amb-veil" />
      <span className="amb-grain" />
    </div>
  )
}
