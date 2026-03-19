import type { SandboxOptions } from '@arrow-js/sandbox'

export interface SandboxDemoExample {
  id: string
  label: string
  description: string
  code: string
  options?: Omit<SandboxOptions, 'onError' | 'debug'>
}

export const sandboxExamples: SandboxDemoExample[] = [
  {
    id: 'counter',
    label: 'Counter',
    description:
      'Single-file sandbox code with implicit Arrow imports. Clicking the button updates reactive state inside QuickJS, then patches the host DOM.',
    code: `const state = reactive({ count: 0 })

export default html\`
  <button class="demo-button" @click="\${() => state.count++}">
    Clicked \${() => state.count}
  </button>
\``,
  },
  {
    id: 'split-files',
    label: 'Split Files',
    description:
      'A virtual module graph with explicit imports between files. Only @arrow-js/core is allowed as a bare import.',
    code: `import App from './App.ts'

export default App`,
    options: {
      entry: '/main.ts',
      files: {
        '/main.ts': `import App from './App.ts'

export default App`,
        '/state.ts': `import { reactive } from '@arrow-js/core'

export const state = reactive({ count: 0 })`,
        '/App.ts': `import { html } from '@arrow-js/core'
import { state } from './state.ts'

export default html\`
  <div class="stack">
    <button class="demo-button" @click="\${() => state.count++}">
      +
    </button>
    <span class="demo-count">\${() => state.count}</span>
  </div>
\``,
      },
    },
  },
  {
    id: 'async-module',
    label: 'Async Module',
    description:
      'Top-level await runs inside the async QuickJS VM. The host still only renders DOM and forwards sanitized events.',
    code: `await Promise.resolve()

const state = reactive({
  armed: false,
  clicks: 0,
})

export default html\`
  <section class="stack">
    <button
      class="demo-button"
      data-state="\${() => (state.armed ? 'armed' : 'idle')}"
      @click="\${() => {
        state.armed = true
        state.clicks++
      }}"
    >
      \${() => (state.armed ? 'Sandbox Armed' : 'Arm Sandbox')}
    </button>
    <p>Clicks handled inside QuickJS: \${() => state.clicks}</p>
  </section>
\``,
  },
]
