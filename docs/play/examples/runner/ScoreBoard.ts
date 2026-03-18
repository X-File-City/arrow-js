import { component, html } from '@arrow-js/core'

export const ScoreBoard = component(
  (props: { score: () => number; highScore: () => number }) =>
    html`<div class="flap-scores">
      <span class="flap-score">${() => props.score()}</span>
      <span class="flap-best">Best: ${() => props.highScore()}</span>
    </div>`
)
