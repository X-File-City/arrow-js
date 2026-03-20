import { component, html, onCleanup, reactive, type Props } from '@arrow-js/core'
import { normalizeLanguage } from '../code-language'

type CopyableSnippetProps = Record<PropertyKey, unknown> & {
  label: string
  language: string
  source: string
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }

  textarea.remove()
  return copied
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall back to the older user-gesture path when needed.
  }

  return fallbackCopyText(text)
}

export const CopyableSnippet = component<CopyableSnippetProps>((props: Props<CopyableSnippetProps>) => {
  const state = reactive({ copied: false })
  let timer: ReturnType<typeof setTimeout> | undefined

  onCleanup(() => clearTimeout(timer))

  async function copy() {
    if (!(await copyText(props.source))) return
    state.copied = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      state.copied = false
    }, 1600)
  }

  return html`<div class="code-block copyable-snippet">
    <div class="copyable-snippet-head">
      <div class="copyable-snippet-label">${() => props.label}</div>
      <button
        type="button"
        class="copy-menu-btn copyable-snippet-btn"
        @click="${copy}"
      >${() => state.copied ? 'Copied' : 'Copy'}</button>
    </div>
    <pre><code
      class="${() => `language-${normalizeLanguage(props.language)}`}"
      data-code-source="${() => encodeURIComponent(props.source)}"
      data-disable-twoslash="true"
    >${() => props.source}</code></pre>
  </div>`
})
