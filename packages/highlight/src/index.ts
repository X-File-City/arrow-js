export type ArrowHtmlTokenType =
  | 'comment'
  | 'content'
  | 'delimiter'
  | 'tag'
  | 'attr-name'
  | 'attr-value'

export interface ArrowHtmlRegion {
  start: number
  end: number
}

export interface ArrowHtmlToken extends ArrowHtmlRegion {
  type: ArrowHtmlTokenType
}

export interface ArrowHtmlOptions {
  tags?: readonly string[]
}

export interface ArrowHtmlDecorateOptions extends ArrowHtmlOptions {
  classPrefix?: string
}

export type ArrowHtmlPresetName = 'one-dark'
export type ArrowHtmlPresetMode = 'light' | 'dark'

export type ArrowHtmlPresetTheme = Record<ArrowHtmlTokenType, string>

export interface ArrowHtmlPreset {
  light: ArrowHtmlPresetTheme
  dark: ArrowHtmlPresetTheme
}

const DEFAULT_TAGS = ['html', 't'] as const
export const DEFAULT_ARROW_HTML_PRESET = 'one-dark' as const

const TOKEN_CLASS_SUFFIX: Record<ArrowHtmlTokenType, string> = {
  comment: 'comment',
  content: 'content',
  delimiter: 'delimiter',
  tag: 'tag',
  'attr-name': 'attr-name',
  'attr-value': 'attr-value',
}

export const ARROW_HTML_PRESETS: Record<ArrowHtmlPresetName, ArrowHtmlPreset> = {
  'one-dark': {
    light: {
      comment: '#a0a1a7',
      content: '#383a42',
      delimiter: '#4078f2',
      tag: '#e45649',
      'attr-name': '#a626a4',
      'attr-value': '#50a14f',
    },
    dark: {
      comment: '#5c6370',
      content: '#d19a66',
      delimiter: '#61afef',
      tag: '#e06c75',
      'attr-name': '#c678dd',
      'attr-value': '#98c379',
    },
  },
}

function resolveTags(tags?: readonly string[]) {
  return [...(tags?.length ? tags : DEFAULT_TAGS)].sort((left, right) =>
    right.length - left.length
  )
}

function arrowHtmlPresetVarName(
  mode: ArrowHtmlPresetMode,
  type: ArrowHtmlTokenType
) {
  return `--arrow-html-${mode}-${TOKEN_CLASS_SUFFIX[type]}`
}

export function getArrowHtmlPreset(
  name: ArrowHtmlPresetName = DEFAULT_ARROW_HTML_PRESET
) {
  return ARROW_HTML_PRESETS[name]
}

export function applyArrowHtmlPreset(
  target: HTMLElement,
  name: ArrowHtmlPresetName = DEFAULT_ARROW_HTML_PRESET
) {
  const preset = getArrowHtmlPreset(name)

  for (const mode of ['light', 'dark'] as const) {
    const theme = preset[mode]

    for (const type of Object.keys(TOKEN_CLASS_SUFFIX) as ArrowHtmlTokenType[]) {
      target.style.setProperty(arrowHtmlPresetVarName(mode, type), theme[type])
    }
  }

  target.dataset.arrowHtmlPreset = name
  return preset
}

function skipString(source: string, index: number, quote: string) {
  for (let i = index + 1; i < source.length; i++) {
    if (source[i] === '\\') {
      i++
      continue
    }
    if (source[i] === quote) return i + 1
  }

  return source.length
}

function skipLineComment(source: string, index: number) {
  const next = source.indexOf('\n', index + 2)
  return next === -1 ? source.length : next
}

function skipBlockComment(source: string, index: number) {
  const next = source.indexOf('*/', index + 2)
  return next === -1 ? source.length : next + 2
}

function templateTagLength(
  source: string,
  index: number,
  tags: readonly string[]
) {
  for (const tag of tags) {
    if (!source.startsWith(`${tag}\``, index)) {
      continue
    }

    const prev = source[index - 1]
    if (prev && /[\w$.]/.test(prev)) {
      return 0
    }

    return tag.length + 1
  }

  return 0
}

function scanTaggedTemplate(
  source: string,
  index: number,
  regions: ArrowHtmlRegion[],
  tags: readonly string[]
) {
  let segmentStart = index

  for (let i = index; i < source.length; i++) {
    if (source[i] === '$' && source[i + 1] === '{') {
      if (segmentStart < i) {
        regions.push({ start: segmentStart, end: i })
      }

      i = skipJsExpression(source, i + 2, regions, tags) - 1
      segmentStart = i + 1
      continue
    }

    if (source[i] === '`') {
      if (segmentStart < i) {
        regions.push({ start: segmentStart, end: i })
      }

      return i + 1
    }
  }

  if (segmentStart < source.length) {
    regions.push({ start: segmentStart, end: source.length })
  }

  return source.length
}

function skipTemplateLiteral(
  source: string,
  index: number,
  tags: readonly string[]
) {
  for (let i = index + 1; i < source.length; i++) {
    if (source[i] === '\\') {
      i++
      continue
    }

    if (source[i] === '`') return i + 1

    if (source[i] === '$' && source[i + 1] === '{') {
      i = skipJsExpression(source, i + 2, undefined, tags) - 1
    }
  }

  return source.length
}

function skipJsExpression(
  source: string,
  index: number,
  regions: ArrowHtmlRegion[] | undefined,
  tags: readonly string[]
) {
  let depth = 0

  for (let i = index; i < source.length; i++) {
    const char = source[i]
    const tagLength = templateTagLength(source, i, tags)

    if (tagLength) {
      i = scanTaggedTemplate(source, i + tagLength, regions ?? [], tags) - 1
      continue
    }

    if (char === "'" || char === '"') {
      i = skipString(source, i, char) - 1
      continue
    }

    if (char === '`') {
      i = skipTemplateLiteral(source, i, tags) - 1
      continue
    }

    if (char === '/' && source[i + 1] === '/') {
      i = skipLineComment(source, i) - 1
      continue
    }

    if (char === '/' && source[i + 1] === '*') {
      i = skipBlockComment(source, i) - 1
      continue
    }

    if (char === '{') {
      depth++
      continue
    }

    if (char === '}') {
      if (!depth) return i + 1
      depth--
    }
  }

  return source.length
}

export function collectArrowHtmlTemplateRegions(
  source: string,
  options: ArrowHtmlOptions = {}
) {
  const tags = resolveTags(options.tags)
  const regions: ArrowHtmlRegion[] = []

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    const tagLength = templateTagLength(source, i, tags)

    if (tagLength) {
      i = scanTaggedTemplate(source, i + tagLength, regions, tags) - 1
      continue
    }

    if (char === "'" || char === '"') {
      i = skipString(source, i, char) - 1
      continue
    }

    if (char === '`') {
      i = skipTemplateLiteral(source, i, tags) - 1
      continue
    }

    if (char === '/' && source[i + 1] === '/') {
      i = skipLineComment(source, i) - 1
      continue
    }

    if (char === '/' && source[i + 1] === '*') {
      i = skipBlockComment(source, i) - 1
    }
  }

  return regions
}

export function tokenizeArrowHtmlSegment(segment: string, offset = 0) {
  const tokens: ArrowHtmlToken[] = []

  const push = (start: number, end: number, type: ArrowHtmlTokenType) => {
    if (end > start) {
      tokens.push({
        start: offset + start,
        end: offset + end,
        type,
      })
    }
  }

  let i = 0
  let contentStart = 0

  while (i < segment.length) {
    if (segment.startsWith('<!--', i)) {
      push(contentStart, i, 'content')
      const end = segment.indexOf('-->', i + 4)
      const next = end === -1 ? segment.length : end + 3
      push(i, next, 'comment')
      i = next
      contentStart = i
      continue
    }

    if (segment[i] !== '<') {
      i++
      continue
    }

    const next = segment[i + 1]
    if (!next || /[\s=]/.test(next)) {
      i++
      continue
    }

    push(contentStart, i, 'content')

    let cursor = i

    if (segment.startsWith('</', cursor)) {
      push(cursor, cursor + 2, 'delimiter')
      cursor += 2
    } else {
      push(cursor, cursor + 1, 'delimiter')
      cursor++
    }

    const nameStart = cursor
    while (cursor < segment.length && /[A-Za-z0-9:_-]/.test(segment[cursor])) {
      cursor++
    }
    push(nameStart, cursor, 'tag')

    while (cursor < segment.length) {
      while (cursor < segment.length && /\s/.test(segment[cursor])) {
        cursor++
      }

      if (segment.startsWith('/>', cursor)) {
        push(cursor, cursor + 2, 'delimiter')
        cursor += 2
        break
      }

      if (segment[cursor] === '>') {
        push(cursor, cursor + 1, 'delimiter')
        cursor++
        break
      }

      if (segment[cursor] === '<') {
        break
      }

      const attrStart = cursor
      while (cursor < segment.length && !/[\s=>/]/.test(segment[cursor])) {
        cursor++
      }
      if (cursor === attrStart) {
        cursor++
        continue
      }
      push(attrStart, cursor, 'attr-name')

      while (cursor < segment.length && /\s/.test(segment[cursor])) {
        cursor++
      }

      if (segment[cursor] !== '=') {
        continue
      }

      cursor++
      while (cursor < segment.length && /\s/.test(segment[cursor])) {
        cursor++
      }

      const valueStart = cursor
      const quote = segment[cursor]

      if (quote === '"' || quote === "'") {
        cursor++

        while (cursor < segment.length) {
          if (segment[cursor] === '\\') {
            cursor += 2
            continue
          }

          if (segment[cursor] === quote) {
            cursor++
            break
          }

          cursor++
        }
      } else {
        while (cursor < segment.length && !/[\s>]/.test(segment[cursor])) {
          cursor++
        }
      }

      push(valueStart, cursor, 'attr-value')
    }

    i = cursor
    contentStart = i
  }

  push(contentStart, segment.length, 'content')

  return tokens
}

function tokenizeTaggedTemplate(
  source: string,
  index: number,
  tokens: ArrowHtmlToken[],
  tags: readonly string[]
) {
  const push = (start: number, end: number, type: ArrowHtmlTokenType) => {
    if (end > start) {
      tokens.push({ start, end, type })
    }
  }

  let i = index
  let mode: 'data' | 'comment' | 'tag' = 'data'
  let contentStart = index
  let attrValueStart = -1
  let attrQuote: '"' | "'" | null = null

  while (i < source.length) {
    if (mode === 'data') {
      if (source[i] === '$' && source[i + 1] === '{') {
        push(contentStart, i, 'content')
        i = skipJsExpressionForTokens(source, i + 2, tokens, tags)
        contentStart = i
        continue
      }

      if (source[i] === '`') {
        push(contentStart, i, 'content')
        return i + 1
      }

      if (source.startsWith('<!--', i)) {
        push(contentStart, i, 'content')
        contentStart = i
        mode = 'comment'
        i += 4
        continue
      }

      const next = source[i + 1]
      if (source[i] !== '<' || !next || /[\s=]/.test(next)) {
        i++
        continue
      }

      push(contentStart, i, 'content')

      if (source.startsWith('</', i)) {
        push(i, i + 2, 'delimiter')
        i += 2
      } else {
        push(i, i + 1, 'delimiter')
        i++
      }

      const nameStart = i
      while (i < source.length && /[A-Za-z0-9:_-]/.test(source[i])) {
        i++
      }
      push(nameStart, i, 'tag')
      mode = 'tag'
      continue
    }

    if (mode === 'comment') {
      if (source[i] === '$' && source[i + 1] === '{') {
        push(contentStart, i, 'comment')
        i = skipJsExpressionForTokens(source, i + 2, tokens, tags)
        contentStart = i
        continue
      }

      if (source.startsWith('-->', i)) {
        push(contentStart, i + 3, 'comment')
        i += 3
        mode = 'data'
        contentStart = i
        continue
      }

      if (source[i] === '`') {
        push(contentStart, i, 'comment')
        return i + 1
      }

      i++
      continue
    }

    if (attrValueStart !== -1) {
      if (source[i] === '$' && source[i + 1] === '{') {
        push(attrValueStart, i, 'attr-value')
        i = skipJsExpressionForTokens(source, i + 2, tokens, tags)
        attrValueStart = i
        continue
      }

      if (attrQuote) {
        if (source[i] === '\\') {
          i = Math.min(i + 2, source.length)
          continue
        }

        if (source[i] === attrQuote) {
          i++
          push(attrValueStart, i, 'attr-value')
          attrValueStart = -1
          attrQuote = null
          continue
        }

        if (source[i] === '`') {
          push(attrValueStart, i, 'attr-value')
          return i + 1
        }

        i++
        continue
      }

      if (
        source[i] === '`' ||
        source[i] === '>' ||
        source.startsWith('/>', i) ||
        /\s/.test(source[i])
      ) {
        push(attrValueStart, i, 'attr-value')
        attrValueStart = -1

        if (source[i] === '`') {
          return i + 1
        }

        continue
      }

      i++
      continue
    }

    if (source[i] === '$' && source[i + 1] === '{') {
      i = skipJsExpressionForTokens(source, i + 2, tokens, tags)
      continue
    }

    if (source[i] === '`') {
      return i + 1
    }

    if (/\s/.test(source[i])) {
      i++
      continue
    }

    if (source.startsWith('/>', i)) {
      push(i, i + 2, 'delimiter')
      i += 2
      mode = 'data'
      contentStart = i
      continue
    }

    if (source[i] === '>') {
      push(i, i + 1, 'delimiter')
      i++
      mode = 'data'
      contentStart = i
      continue
    }

    if (source[i] === '<') {
      mode = 'data'
      contentStart = i
      continue
    }

    const attrStart = i
    while (
      i < source.length &&
      !(source[i] === '$' && source[i + 1] === '{') &&
      source[i] !== '`' &&
      !/[\s=>/]/.test(source[i])
    ) {
      i++
    }
    if (i === attrStart) {
      i++
      continue
    }
    push(attrStart, i, 'attr-name')

    while (i < source.length && /\s/.test(source[i])) {
      i++
    }

    if (source[i] !== '=') {
      continue
    }

    i++
    while (i < source.length && /\s/.test(source[i])) {
      i++
    }

    attrValueStart = i
    const quote = source[i]
    if (quote === '"' || quote === "'") {
      attrQuote = quote
      i++
    } else {
      attrQuote = null
    }
  }

  if (mode === 'data') {
    push(contentStart, source.length, 'content')
  } else if (mode === 'comment') {
    push(contentStart, source.length, 'comment')
  } else if (attrValueStart !== -1) {
    push(attrValueStart, source.length, 'attr-value')
  }

  return source.length
}

function skipJsExpressionForTokens(
  source: string,
  index: number,
  tokens: ArrowHtmlToken[],
  tags: readonly string[]
) {
  let depth = 0

  for (let i = index; i < source.length; i++) {
    const char = source[i]
    const tagLength = templateTagLength(source, i, tags)

    if (tagLength) {
      i = tokenizeTaggedTemplate(source, i + tagLength, tokens, tags) - 1
      continue
    }

    if (char === "'" || char === '"') {
      i = skipString(source, i, char) - 1
      continue
    }

    if (char === '`') {
      i = skipTemplateLiteral(source, i, tags) - 1
      continue
    }

    if (char === '/' && source[i + 1] === '/') {
      i = skipLineComment(source, i) - 1
      continue
    }

    if (char === '/' && source[i + 1] === '*') {
      i = skipBlockComment(source, i) - 1
      continue
    }

    if (char === '{') {
      depth++
      continue
    }

    if (char === '}') {
      if (!depth) return i + 1
      depth--
    }
  }

  return source.length
}

export function tokenizeArrowHtmlTemplates(
  source: string,
  options: ArrowHtmlOptions = {}
) {
  const tokens: ArrowHtmlToken[] = []
  const tags = resolveTags(options.tags)

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    const tagLength = templateTagLength(source, i, tags)

    if (tagLength) {
      i = tokenizeTaggedTemplate(source, i + tagLength, tokens, tags) - 1
      continue
    }

    if (char === "'" || char === '"') {
      i = skipString(source, i, char) - 1
      continue
    }

    if (char === '`') {
      i = skipTemplateLiteral(source, i, tags) - 1
      continue
    }

    if (char === '/' && source[i + 1] === '/') {
      i = skipLineComment(source, i) - 1
      continue
    }

    if (char === '/' && source[i + 1] === '*') {
      i = skipBlockComment(source, i) - 1
    }
  }

  return tokens
}

export function arrowHtmlTokenClassName(
  type: ArrowHtmlTokenType,
  prefix = 'arrow-html'
) {
  return `${prefix}-${TOKEN_CLASS_SUFFIX[type]}`
}

interface TextNodeRange {
  node: Text
  start: number
  end: number
}

function isSkippedTextNode(node: Node) {
  const parent = node.parentElement

  return !!parent?.closest('.twoslash-popup-container')
}

function collectVisibleTextNodeRanges(root: ParentNode) {
  const textNodes: TextNodeRange[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isSkippedTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    },
  })

  let offset = 0
  let current = walker.nextNode()

  while (current) {
    if (current instanceof Text) {
      const value = current.data
      textNodes.push({
        node: current,
        start: offset,
        end: offset + value.length,
      })
      offset += value.length
    }

    current = walker.nextNode()
  }

  return {
    source: textNodes.map((entry) => entry.node.data).join(''),
    textNodes,
  }
}

function decorateTextNode(
  entry: TextNodeRange,
  tokens: readonly ArrowHtmlToken[],
  classPrefix: string
) {
  const overlaps = tokens
    .filter((token) => token.start < entry.end && token.end > entry.start)
    .map((token) => ({
      start: Math.max(token.start, entry.start) - entry.start,
      end: Math.min(token.end, entry.end) - entry.start,
      className: arrowHtmlTokenClassName(token.type, classPrefix),
    }))

  if (!overlaps.length) {
    return
  }

  const fragment = document.createDocumentFragment()
  const text = entry.node.data
  let cursor = 0

  for (const overlap of overlaps) {
    if (overlap.start > cursor) {
      fragment.append(text.slice(cursor, overlap.start))
    }

    const span = document.createElement('span')
    span.className = overlap.className
    span.textContent = text.slice(overlap.start, overlap.end)
    fragment.append(span)
    cursor = overlap.end
  }

  if (cursor < text.length) {
    fragment.append(text.slice(cursor))
  }

  entry.node.replaceWith(fragment)
}

export function decorateArrowHtmlCodeElement(
  code: HTMLElement,
  source: string,
  options: ArrowHtmlDecorateOptions = {}
) {
  const tokens = tokenizeArrowHtmlTemplates(source, options)

  if (!tokens.length) {
    return false
  }

  const { source: renderedSource, textNodes } = collectVisibleTextNodeRanges(code)
  if (renderedSource !== source && renderedSource !== `${source}\n`) {
    return false
  }

  const classPrefix = options.classPrefix ?? 'arrow-html'

  for (const entry of textNodes) {
    decorateTextNode(entry, tokens, classPrefix)
  }

  return true
}
