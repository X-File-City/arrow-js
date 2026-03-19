import { describe, expect, it } from 'vitest'
import {
  ARROW_HTML_PRESETS,
  DEFAULT_ARROW_HTML_PRESET,
  applyArrowHtmlPreset,
  arrowHtmlTokenClassName,
  collectArrowHtmlTemplateRegions,
  decorateArrowHtmlCodeElement,
  getArrowHtmlPreset,
  tokenizeArrowHtmlTemplates,
} from './index'

describe('@arrow-js/highlight', () => {
  it('collects html regions from Arrow template literals', () => {
    const source =
      "const view = html`<ul>${items.map(item => html`<li>${item.name}</li>`)}<footer>Done</footer></ul>`"

    const regions = collectArrowHtmlTemplateRegions(source)

    expect(regions.map((region) => source.slice(region.start, region.end))).toEqual([
      '<ul>',
      '<li>',
      '</li>',
      '<footer>Done</footer></ul>',
    ])
  })

  it('ignores lookalikes inside comments, strings, and property access', () => {
    const source = [
      "const label = 'html`<div>`'",
      '// html`<aside>`',
      'obj.html`<span>`',
      'const ok = html`<main class="hero">Hello</main>`',
    ].join('\n')

    const tokens = tokenizeArrowHtmlTemplates(source)

    expect(tokens.map((token) => [token.type, source.slice(token.start, token.end)])).toEqual([
      ['delimiter', '<'],
      ['tag', 'main'],
      ['attr-name', 'class'],
      ['attr-value', '"hero"'],
      ['delimiter', '>'],
      ['content', 'Hello'],
      ['delimiter', '</'],
      ['tag', 'main'],
      ['delimiter', '>'],
    ])
  })

  it('keeps tag boundaries and attr values across interpolations', () => {
    const source =
      'const view = html`<button @click="${() => data.count++}">Clear done</button>`'

    const tokens = tokenizeArrowHtmlTemplates(source)

    expect(tokens.map((token) => [token.type, source.slice(token.start, token.end)])).toEqual([
      ['delimiter', '<'],
      ['tag', 'button'],
      ['attr-name', '@click'],
      ['attr-value', '"'],
      ['attr-value', '"'],
      ['delimiter', '>'],
      ['content', 'Clear done'],
      ['delimiter', '</'],
      ['tag', 'button'],
      ['delimiter', '>'],
    ])
  })

  it('does not hang on malformed tag openings with interpolations', () => {
    const source =
      'const view = html`<div><h1${() => value.val}${sandbox(data)}</div>`'

    const tokens = tokenizeArrowHtmlTemplates(source)
    const rendered = tokens.map((token) => [token.type, source.slice(token.start, token.end)])

    expect(rendered).toEqual(
      expect.arrayContaining([
        ['delimiter', '<'],
        ['tag', 'div'],
        ['delimiter', '</'],
        ['tag', 'div'],
        ['delimiter', '>'],
      ])
    )
  })

  it('decorates rendered code while skipping Twoslash popup content', () => {
    const source = 'const view = html`<div>${name}</div>`'
    const code = document.createElement('code')
    code.innerHTML = [
      '<span>const view = html`</span>',
      '<span>&lt;div&gt;</span>',
      '<span>${</span>',
      '<span class="twoslash-hover">',
      'name',
      '<span class="twoslash-popup-container"><code>const name: string</code></span>',
      '</span>',
      '<span>}</span>',
      '<span>&lt;/div&gt;`</span>',
    ].join('')

    const decorated = decorateArrowHtmlCodeElement(code, source)

    expect(decorated).toBe(true)
    expect(code.querySelectorAll('.arrow-html-tag')).toHaveLength(2)
    expect(code.querySelectorAll('.arrow-html-delimiter')).toHaveLength(4)
    expect(code.querySelectorAll('.arrow-html-content')).toHaveLength(0)
    expect(code.querySelector('.twoslash-popup-container .arrow-html-tag')).toBeNull()
  })

  it('builds stable shared class names', () => {
    expect(arrowHtmlTokenClassName('attr-name')).toBe('arrow-html-attr-name')
    expect(arrowHtmlTokenClassName('tag', 'play')).toBe('play-tag')
  })

  it('exposes and applies the default named preset', () => {
    const root = document.createElement('div')
    const preset = applyArrowHtmlPreset(root)

    expect(getArrowHtmlPreset()).toBe(ARROW_HTML_PRESETS[DEFAULT_ARROW_HTML_PRESET])
    expect(preset).toEqual(ARROW_HTML_PRESETS[DEFAULT_ARROW_HTML_PRESET])
    expect(root.dataset.arrowHtmlPreset).toBe(DEFAULT_ARROW_HTML_PRESET)
    expect(root.style.getPropertyValue('--arrow-html-light-content')).toBe(
      '#383a42'
    )
    expect(root.style.getPropertyValue('--arrow-html-dark-tag')).toBe('#e06c75')
  })
})
