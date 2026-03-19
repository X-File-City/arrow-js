import { sandbox, type SandboxInstance, type SandboxOptions } from '@arrow-js/sandbox'
import { sandboxExamples } from './examples'
import './styles.css'

const root = document.querySelector('#app')

if (!root) {
  throw new Error('Demo root #app was not found.')
}

root.innerHTML = `
  <div class="shell">
    <header class="hero">
      <p class="eyebrow">QuickJS + Arrow</p>
      <h1>@arrow-js/sandbox</h1>
      <p class="lede">
        User-authored Arrow code executes inside QuickJS/WASM. The host page only
        renders DOM and forwards sanitized events.
      </p>
    </header>

    <main class="workspace">
      <section class="panel controls">
        <div class="section-head">
          <h2>Examples</h2>
          <p>Select an example, edit the source, then mount or hot-update the sandbox.</p>
        </div>
        <div class="example-list" data-example-list></div>
        <div class="meta">
          <p data-description></p>
          <pre class="file-list" data-files></pre>
        </div>
      </section>

      <section class="panel editor">
        <div class="section-head">
          <h2>Entry Source</h2>
          <p>The editor always shows the active entry module.</p>
        </div>
        <textarea class="source" spellcheck="false" data-source></textarea>
        <div class="actions">
          <button class="action solid" type="button" data-action="mount">Mount Fresh</button>
          <button class="action" type="button" data-action="update">Update Existing</button>
          <button class="action ghost" type="button" data-action="destroy">Destroy</button>
        </div>
        <p class="status" data-status>Idle.</p>
      </section>

      <section class="panel preview">
        <div class="section-head">
          <h2>Host DOM</h2>
          <p>This tree lives in the real browser DOM. User logic does not.</p>
        </div>
        <div class="preview-surface">
          <div class="preview-root" data-preview></div>
        </div>
      </section>
    </main>
  </div>
`

const elements = {
  exampleList: root.querySelector('[data-example-list]') as HTMLDivElement,
  description: root.querySelector('[data-description]') as HTMLParagraphElement,
  files: root.querySelector('[data-files]') as HTMLPreElement,
  source: root.querySelector('[data-source]') as HTMLTextAreaElement,
  status: root.querySelector('[data-status]') as HTMLParagraphElement,
  preview: root.querySelector('[data-preview]') as HTMLDivElement,
  mount: root.querySelector('[data-action="mount"]') as HTMLButtonElement,
  update: root.querySelector('[data-action="update"]') as HTMLButtonElement,
  destroy: root.querySelector('[data-action="destroy"]') as HTMLButtonElement,
}

let activeExampleIndex = 0
let instance: SandboxInstance | null = null

function setStatus(message: string, tone: 'idle' | 'error' = 'idle') {
  elements.status.textContent = message
  elements.status.dataset.tone = tone
}

function getActiveExample() {
  return sandboxExamples[activeExampleIndex]
}

function buildRunConfig() {
  const example = getActiveExample()
  const options: SandboxOptions = {
    ...example.options,
    debug: true,
    onError(error) {
      setStatus(
        error instanceof Error ? error.message : String(error),
        'error'
      )
    },
  }

  const source = elements.source.value

  if (options.files && options.entry) {
    options.files = {
      ...options.files,
      [options.entry]: source,
    }
    return {
      code: '',
      options,
    }
  }

  return {
    code: source,
    options,
  }
}

function renderFiles() {
  const example = getActiveExample()
  const files = example.options?.files
  if (!files) {
    elements.files.textContent = 'Single-file entry'
    return
  }

  elements.files.textContent = Object.keys(files)
    .sort()
    .map((file) => (file === example.options?.entry ? `${file}  <- entry` : file))
    .join('\n')
}

function renderExamples() {
  elements.exampleList.replaceChildren(
    ...sandboxExamples.map((example, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'example-chip'
      button.textContent = example.label
      button.dataset.selected = index === activeExampleIndex ? 'true' : 'false'
      button.addEventListener('click', () => {
        activeExampleIndex = index
        syncExampleState()
      })
      return button
    })
  )
}

function syncExampleState() {
  const example = getActiveExample()
  elements.description.textContent = example.description
  elements.source.value = example.options?.entry
    ? example.options.files?.[example.options.entry] ?? example.code
    : example.code
  renderExamples()
  renderFiles()
  setStatus(`Loaded "${example.label}".`)
}

async function mountFresh() {
  const { code, options } = buildRunConfig()
  instance?.destroy()
  instance = null
  elements.preview.replaceChildren()
  setStatus('Booting sandbox...')

  try {
    instance = await sandbox(code, elements.preview, options)
    setStatus(`Mounted "${getActiveExample().label}".`)
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error')
  }
}

async function updateExisting() {
  const { code, options } = buildRunConfig()

  if (!instance) {
    await mountFresh()
    return
  }

  setStatus('Updating sandbox...')

  try {
    await instance.update(code, options)
    setStatus(`Updated "${getActiveExample().label}".`)
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error')
  }
}

function destroySandbox() {
  instance?.destroy()
  instance = null
  elements.preview.replaceChildren()
  setStatus('Sandbox destroyed.')
}

elements.mount.addEventListener('click', () => {
  void mountFresh()
})

elements.update.addEventListener('click', () => {
  void updateExisting()
})

elements.destroy.addEventListener('click', destroySandbox)

syncExampleState()
void mountFresh()
