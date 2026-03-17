import { createOnigurumaEngine } from '@shikijs/engine-oniguruma'
import wasm from '@shikijs/engine-oniguruma/wasm-inlined'
import { describe, expect, it } from 'vitest'
import manifest from './package.json'
import grammar from './syntaxes/arrowjs-html.injection.tmLanguage.json'
import arrowHtmlGrammar from './syntaxes/arrowjs-html.tmLanguage.json'

async function findMatches(pattern: string, line: string) {
  const engine = await createOnigurumaEngine(wasm)
  const scanner = engine.createScanner([pattern]) as {
    findNextMatchSync: (
      text: unknown,
      index: number
    ) => { captureIndices: Array<{ start: number; end: number }> } | null
  }
  const text = engine.createString(line)
  const matches = []
  let index = 0

  while (index <= line.length) {
    const match = scanner.findNextMatchSync(text, index)
    if (!match) break
    matches.push(
      match.captureIndices.map((capture) => line.slice(capture.start, capture.end))
    )
    index = match.captureIndices[0].end || index + 1
  }

  return matches
}

describe('arrowjs-html-syntax', () => {
  it('targets the JS and TS grammars that Arrow users need', () => {
    expect(manifest.contributes.grammars).toHaveLength(2)

    expect(manifest.contributes.grammars[0]).toMatchObject({
      scopeName: 'inline.arrowjs.html',
      injectTo: ['source.js', 'source.js.jsx', 'source.ts', 'source.tsx'],
      embeddedLanguages: {
        'meta.embedded.block.html': 'html',
      },
      tokenTypes: {
        'meta.embedded.block.html': 'other',
      },
    })

    expect(manifest.contributes.grammars[1]).toMatchObject({
      scopeName: 'text.html.arrowjs',
    })
  })

  it('matches Arrow tagged template openings and ignores property access lookalikes', async () => {
    const begin = grammar.patterns[0].begin

    expect(await findMatches(begin, 'html`<div>`')).toEqual([['html`', 'html', '`']])
    expect(await findMatches(begin, 't `<span>`')).toEqual([['t `', 't ', '`']])
    expect(await findMatches(begin, 'obj.html`<div>`')).toEqual([])
    expect(await findMatches(begin, 'foo.t`<div>`')).toEqual([])
  })

  it('keeps the HTML and interpolation includes wired to standard grammars', () => {
    const arrowTemplate = grammar.patterns[0]

    expect(grammar.scopeName).toBe('inline.arrowjs.html')
    expect(arrowTemplate.contentName).toBe('meta.embedded.block.html')
    expect(arrowTemplate.patterns).toEqual([
      { include: 'source.ts#template-substitution-element' },
      { include: 'source.ts#string-character-escape' },
      { include: 'text.html.arrowjs' },
    ])
    expect(arrowHtmlGrammar.scopeName).toBe('text.html.arrowjs')
  })

  it('keeps multiline attribute-value boundaries represented in the grammar', () => {
    const arrowTemplate = grammar.patterns[0]

    expect(arrowTemplate.begin).toContain('(?:html|t)')
    expect(arrowTemplate.end).toBe('(`)')
    expect(arrowTemplate.beginCaptures['2'].name).toBe(
      'punctuation.definition.string.template.begin.js'
    )
    expect(arrowTemplate.endCaptures['1'].name).toBe(
      'punctuation.definition.string.template.end.js'
    )
  })

  it('preserves escaped backticks inside embedded code samples', () => {
    const arrowTemplate = grammar.patterns[0]

    expect(arrowTemplate.patterns).toContainEqual({
      include: 'source.ts#string-character-escape',
    })
  })

  it('can find interpolation boundaries repeatedly in nested template samples', async () => {
    const matches = await findMatches(
      '\\$\\{',
      'html`<ul>${items.map(item => html`<li>${item}</li>`)}</ul>`'
    )

    expect(matches).toEqual([['${'], ['${']])
  })

  it('allows template substitutions inside quoted Arrow attribute values', () => {
    const quotedDouble = arrowHtmlGrammar.repository['attribute-interior'].patterns[0].patterns[2]
    const quotedSingle = arrowHtmlGrammar.repository['attribute-interior'].patterns[0].patterns[3]
    const attribute = arrowHtmlGrammar.repository.attribute.patterns[0]
    const templateExpression = arrowHtmlGrammar.repository['template-substitution-element']

    expect(attribute.begin).toContain('[@.?]?')
    expect(quotedDouble.name).toBe('string.quoted.double.html')
    expect(quotedDouble.patterns).toEqual([
      { include: '#template-substitution-element' },
      { include: 'text.html.basic#entities' },
    ])
    expect(quotedSingle.name).toBe('string.quoted.single.html')
    expect(quotedSingle.patterns).toEqual([
      { include: '#template-substitution-element' },
      { include: 'text.html.basic#entities' },
    ])
    expect(templateExpression).toMatchObject({
      name: 'meta.template.expression.ts',
      begin: '\\$\\{',
      end: '\\}',
      contentName: 'meta.embedded.line.ts',
      patterns: [{ include: 'source.ts#expression' }],
    })
  })
})
