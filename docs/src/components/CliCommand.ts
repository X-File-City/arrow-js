import { component, html, reactive } from '@arrow-js/core'

export const CliCommand = component(() => {
  const state = reactive({ copied: false })
  let timer: ReturnType<typeof setTimeout>

  function copy() {
    navigator.clipboard.writeText('npx @arrow-js/skill')
    state.copied = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      state.copied = false
    }, 2000)
  }

  return html`
    <button
      data-rain-collider
      @click="${copy}"
      class="cli-command"
      aria-label="Copy install command"
    >
      <span class="cli-prompt">$</span>
      <code class="cli-text"><span class="cli-kw">npx</span> @arrow-js/skill</code>
      <span
        class="${() => state.copied ? 'cli-copy cli-copy--done' : 'cli-copy'}"
      >${() =>
        state.copied
          ? html`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8.5 6.5 11.5 12.5 5.5"></polyline></svg>`
          : html`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5.5" y="5.5" width="8" height="9" rx="1.5"></rect><path d="M10.5 5.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v7A1.5 1.5 0 003 11.5h2.5"></path></svg>`
      }</span>
    </button>
  `
})
