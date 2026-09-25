// The most important thing on the screen: what should I do today?
// The problem statement asks for "actionable guidance instead of a raw
// number", so this sits above the AQI, not below it.

const PRIORITY_STYLE = {
  high: { border: 'var(--bad)', label: 'Do now' },
  medium: { border: 'var(--warn)', label: 'Today' },
  low: { border: 'var(--good)', label: 'Tip' },
}

export default function ActionCards({ advice }) {
  if (!advice?.length) return null
  // TODO(you): cap at 3 cards and sort high → low priority.
  // TODO(you): add an icon per action type (window, fan, route, indoor).
  return (
    <section className="actions" aria-label="What to do now">
      {advice.map((a, i) => {
        const style = PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.low
        return (
          <article key={i} className="action-card" style={{ borderLeftColor: style.border }}>
            <span className="action-tag">{style.label}</span>
            <p>{a.text}</p>
          </article>
        )
      })}
    </section>
  )
}
