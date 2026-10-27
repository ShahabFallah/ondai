import { ImageReveal } from '@/components/fx'

const states = ['idle', 'thinking', 'streaming', 'tool call', 'confirmation', 'done', 'error', 'refusal', 'no model']

export function HowItRuns() {
  return (
    <section className="section" aria-labelledby="how">
      <div className="wrap">
        <div className="section-head">
          <h2 id="how" className="h2">
            How it runs.
          </h2>
          <p className="lead">Three steps between you and a shipped AI feature.</p>
        </div>
        <div className="how-grid">
          <ol className="how-steps">
            <li className="how-step">
              <span className="how-num" aria-hidden>
                1
              </span>
              <div>
                <h3 className="h3">Add the component</h3>
                <p className="body">The CLI copies TypeScript source into your project, the way shadcn/ui does. You own the files: change the prompts, the schema, the styling.</p>
                <pre className="stage code-block how-code">
                  npx ondai init{'\n'}npx ondai add summarize
                </pre>
              </div>
            </li>
            <li className="how-step">
              <span className="how-num" aria-hidden>
                2
              </span>
              <div>
                <h3 className="h3">It picks the model on the device</h3>
                <p className="body">Apple Foundation Models on iPhone, Gemini Nano on Android, an optional Llama download anywhere else. The runtime routes by capability, handles cold starts and token budgets, and shows where it ran.</p>
              </div>
            </li>
            <li className="how-step">
              <span className="how-num" aria-hidden>
                3
              </span>
              <div>
                <h3 className="h3">Every state is designed</h3>
                <p className="body">The same quiet language in every component, so your app never shows a spinner and a prayer.</p>
                <ul className="how-states" aria-label="States">
                  {states.map((s) => (
                    <li key={s} className="how-state">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </ol>
          <div className="how-visual">
            <div className="stage how-stage">
              <ImageReveal src="/img/chip.png" alt="A macro photograph of a silicon die, resolving out of an ASCII field" mode="ascii" progress="auto" cell={8} />
            </div>
            <p className="label muted how-caption">The model, resolving.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
