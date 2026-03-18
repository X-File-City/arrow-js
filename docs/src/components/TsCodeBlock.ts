import { html } from '@arrow-js/core'

const CUT_BEFORE = /^\/\/\s?---cut(?:-before)?---$/
const CUT_AFTER = /^\/\/\s?---cut-after---$/
const CUT_START = /^\/\/\s?---cut-start---$/
const CUT_END = /^\/\/\s?---cut-end---$/

function decodeCodeEntities(source: string) {
  return source
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
}

function createVisibleTwoslashPreview(source: string) {
  const lines = source.split('\n')
  const visible: string[] = []
  let skipping = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (CUT_BEFORE.test(trimmed)) {
      visible.length = 0
      continue
    }

    if (CUT_AFTER.test(trimmed)) {
      break
    }

    if (CUT_START.test(trimmed)) {
      skipping = true
      continue
    }

    if (CUT_END.test(trimmed)) {
      skipping = false
      continue
    }

    if (!skipping) {
      visible.push(line)
    }
  }

  while (visible[0] !== undefined && !visible[0].trim()) {
    visible.shift()
  }

  while (visible[visible.length - 1] !== undefined && !visible[visible.length - 1].trim()) {
    visible.pop()
  }

  return visible.join('\n')
}

export function TsCodeBlock(source: string) {
  const decodedSource = decodeCodeEntities(source)

  return html`<div class="code-block">
    <pre><code
      class="language-ts"
      data-code-source="${encodeURIComponent(decodedSource)}"
    >${createVisibleTwoslashPreview(decodedSource)}</code></pre>
  </div>`
}
