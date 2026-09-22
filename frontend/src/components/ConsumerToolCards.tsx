import { CONSUMER_TOOLS, HERO_COPY } from '../lib/consumer-tools'

type Variant = 'hero' | 'pricing'

export function ConsumerToolCards({ variant = 'hero' }: { variant?: Variant }) {
  return (
    <div className="vortx-consumer-tools">
      {CONSUMER_TOOLS.map((tool) => (
        <article
          key={tool.id}
          className="vortx-consumer-tool-card glass-panel rounded-2xl border border-metallic"
        >
          <p className="vortx-consumer-tool-card__eyebrow eyebrow text-soft">
            {variant === 'hero' ? tool.prompt : `${tool.reportPrice} report`}
          </p>
          <h3 className="vortx-consumer-tool-card__title display-font text-ink">{tool.title}</h3>
          <p className="vortx-consumer-tool-card__copy text-muted">{tool.description}</p>
          {variant === 'pricing' ? (
            <p className="vortx-consumer-tool-card__meta data-font text-soft">
              {tool.reportLabel}. No subscription required.
            </p>
          ) : null}
          <a
            href={tool.href}
            className="vortx-consumer-tool-card__cta terminal-button-solid text-sm font-semibold"
          >
            {tool.cta}
          </a>
        </article>
      ))}
    </div>
  )
}

export function HeroPromptChips() {
  return (
    <div className="vortx-consumer-prompts">
      {CONSUMER_TOOLS.map((tool) => (
        <a key={tool.id} href={tool.href} className="vortx-consumer-prompt data-font">
          {tool.prompt}
        </a>
      ))}
    </div>
  )
}

export function ConsumerHeroIntro() {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{HERO_COPY.eyebrow}</p>
      <h2 className="display-font mt-5 max-w-4xl text-5xl tracking-tight md:text-7xl">{HERO_COPY.headline}</h2>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{HERO_COPY.subcopy}</p>
      <HeroPromptChips />
      <ConsumerToolCards variant="hero" />
    </div>
  )
}
