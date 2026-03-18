import { component, html, reactive } from '@arrow-js/core'
import { CounterPanel } from './CounterPanel'

const state = reactive({
  name: 'Arrow',
  count: 0,
})

export const App = component(() => {
  const handleInput = (e: Event) => {
    state.name = (e.target as HTMLInputElement).value
  }

  return html`<div class="app">
    <div class="card">
      <div class="card-header">
        <h1 class="greeting">
          Hello, <span class="name">${() => state.name || 'World'}</span>
        </h1>
        <label class="input-label" for="name-input">Name</label>
        <input
          id="name-input"
          class="input-field"
          type="text"
          placeholder="Type a name…"
          .value="${state.name}"
          @input="${handleInput}"
        />
      </div>

      <div class="divider"></div>

      ${CounterPanel(state)}

      <div class="card-footer">
        <strong>${() => state.name || 'World'}</strong> has
        <strong>${() => state.count}</strong> points — this reads app state.
      </div>
    </div>
  </div>`
})
