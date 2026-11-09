/**
 * The picture under the hero: three things the phone's own model does. A plain request has become an
 * event waiting for an OK (on the phone), a receipt photo an expense, a voice memo to-dos, beside the
 * model that ran them. A stageshow product shot
 * (`/stills/stage/hero`, rendered by `scripts/render-hero.mjs`) saved as a transparent PNG, one per theme
 * and a phone-column crop of each, so it floats on the page's own window light with no plate behind it.
 */
export function HeroStill() {
  const alt =
    "An iPhone running Apple's on-device model: the request \"Dinner with Marco on Saturday at 8 at Luigi's\" has become an event card asking to confirm. Beside it, a receipt photo read into merchant, total and category, and a voice memo turned into three to-dos."
  return (
    <figure className="hx-still">
      {(['light', 'dark'] as const).map((theme) => (
        <picture key={theme} className={`hx-still-pic only-${theme}`}>
          <source media="(max-width: 640px)" srcSet={`/img/stills/hero-sm-${theme}.png`} width={780} height={1440} />
          <img src={`/img/stills/hero-${theme}.png`} alt={alt} width={2080} height={1620} decoding="async" />
        </picture>
      ))}
    </figure>
  )
}
