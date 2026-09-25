// The most important thing on the screen: what should I do today?
// The problem statement asks for "actionable guidance instead of a raw
// number", so this sits above the AQI, not below it.

const PRIORITY_STYLE = {
  high: { border: 'var(--bad)', label: 'Do now' },
  medium: { border: 'var(--warn)', label: 'Today' },
  low: { border: 'var(--good)', label: 'Tip' },
}

// Lower number = shown first.
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

// One glyph per `advice[i].type` from the data contract. `type` is a fixed
// enum the board sends — never infer it by matching words in `text`, which
// breaks the moment the wording changes.
const ACTION_ICON = { window: '🪟', fan: '🌀', route: '🧭', indoor: '🏠' }
const FALLBACK_ICON = '⚠️'

export default function ActionCards({ advice }) {
  if (!advice?.length) return null
  // Copy before sorting: `.sort()` mutates in place, and `advice` is a prop.
  const top = [...advice]
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 3)
  return (
    <section className="actions" aria-label="What to do now">
      {top.map((a, i) => {
        const style = PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.low
        return (
          <article key={i} className="action-card" style={{ borderLeftColor: style.border }}>
            <span className="action-tag">{style.label}</span>
            <p>
              <span className="action-icon" aria-hidden="true">{ACTION_ICON[a.type] ?? FALLBACK_ICON}</span>
              {a.text}
            </p>
          </article>
        )
      })}
    </section>
  )
}
