import { component, html, reactive } from '@arrow-js/core'
import { boundary } from '@arrow-js/framework'
import { CounterCard } from './components/CounterCard'
import { FeatureList } from './components/FeatureList'
import { WelcomeCard } from './components/WelcomeCard'

const state = reactive({
  count: 2,
  features: [
    {
      id: 1,
      label: 'Reactive templates update only where data is read.',
    },
    {
      id: 2,
      label: 'Components keep stable identity by slot and key.',
    },
    {
      id: 3,
      label: 'SSR and hydration stay in separate packages on top of core.',
    },
  ],
})

export const App = component(() =>
  html`<main class="app-shell">
    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow">Arrow + Vite 8</p>
        <h1>Build with a tiny reactive core and add SSR only when you need it.</h1>
        <p class="lede">
          This starter ships with server rendering, hydration, and a small async
          component so you can grow into the full Arrow stack without rewriting
          the app shape later.
        </p>
      </div>

      <div class="hero__grid">
        ${CounterCard(state)}
        ${boundary(WelcomeCard())}
      </div>
    </section>

    ${FeatureList({ items: state.features })}
  </main>`
)
