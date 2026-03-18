import { component, html, reactive } from '@arrow-js/core'
import { ScoreBoard } from './ScoreBoard'
import { createEngine } from './engine'

export const RunnerApp = component(() => {
  const state = reactive({
    phase: 'idle' as 'idle' | 'playing' | 'over',
    score: 0,
    highScore: 0,
  })

  const engine = createEngine({
    onScore: () => { state.score++ },
    onGameOver: () => {
      if (state.score > state.highScore) state.highScore = state.score
      state.phase = 'over'
    },
  })

  const handleInput = () => {
    if (engine.dying) return
    if (state.phase === 'idle') {
      state.score = 0
      state.phase = 'playing'
      engine.start()
    } else if (state.phase === 'playing') {
      engine.flap()
    } else if (state.phase === 'over') {
      state.phase = 'idle'
      state.score = 0
      engine.reset()
    }
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code !== 'Space') return
    e.preventDefault()
    handleInput()
  })

  document.addEventListener('click', handleInput)

  requestAnimationFrame(() => engine.mount())

  return html`<main class="flap">
    <header class="flap-header">
      <h1 class="flap-title">Flappy Arrow</h1>
      ${ScoreBoard({ score: () => state.score, highScore: () => state.highScore })}
    </header>

    <div class="flap-game" id="flap-game">
      <div class="flap-player" id="flap-player" data-phase="${() => state.phase}">()=&gt;</div>
      <div class="flap-ceil"></div>
      <div class="flap-floor"></div>
    </div>

    <footer class="flap-footer">
      <span class="flap-hint">Space or click to flap</span>
    </footer>
  </main>`
})
