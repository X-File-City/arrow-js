import { component, html, reactive } from '@arrow-js/core'

export const CounterPanel = component((props: { count: number }) => {
  const local = reactive({ count: 0 })

  return html`<div class="counter">
    <div class="gauges">
      <div class="gauge">
        <span class="gauge-label">App state</span>
        <span class="gauge-value">${() => props.count}</span>
        <div class="gauge-actions">
          <button class="btn btn--amber btn--sm" @click="${() => props.count--}">−</button>
          <button class="btn btn--amber btn--sm" @click="${() => props.count++}">+</button>
        </div>
        <span class="gauge-hint">Visible to other components</span>
      </div>
      <div class="gauge gauge--local">
        <span class="gauge-label">Component state</span>
        <span class="gauge-value">${() => local.count}</span>
        <div class="gauge-actions">
          <button class="btn btn--local btn--sm" @click="${() => local.count--}">−</button>
          <button class="btn btn--local btn--sm" @click="${() => local.count++}">+</button>
        </div>
        <span class="gauge-hint">Private to this component</span>
      </div>
    </div>
  </div>`
})
