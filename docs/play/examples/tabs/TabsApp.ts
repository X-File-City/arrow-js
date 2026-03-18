import { component, html, reactive } from '@arrow-js/core'
import { TabPanel } from './TabPanel'

const tabs = [
  { id: 'menu', label: 'Menu', icon: '\u2615' },
  { id: 'hours', label: 'Hours', icon: '\u231A' },
  { id: 'about', label: 'About', icon: '\u2661' },
]

export const TabsApp = component(() => {
  const state = reactive({ active: 'menu' })

  return html`<main class="tabs">
    <header class="tabs-header">
      <h1>The Daily Grind</h1>
      <p class="tabs-subtitle">Your neighborhood coffee shop</p>
    </header>

    <div class="tabs-container">
      <nav class="tab-bar" role="tablist" aria-label="Shop info">
        ${tabs.map(
          (tab) => html`<button
            class="tab-trigger"
            role="tab"
            id="${`tab-${tab.id}`}"
            aria-selected="${() => String(state.active === tab.id)}"
            aria-controls="${`panel-${tab.id}`}"
            @click="${() => { state.active = tab.id }}"
          ><span class="tab-icon">${tab.icon}</span>${tab.label}</button>`
        )}
      </nav>

      <section class="tab-panels">
        ${() =>
          tabs.map((tab) =>
            TabPanel({
              id: tab.id,
              active: state.active === tab.id,
            }).key(tab.id)
          )}
      </section>
    </div>
  </main>`
})
