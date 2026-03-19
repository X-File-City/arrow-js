import type {
  AttributeBindingDescriptor,
  ElementDescriptor,
  TemplateDescriptor,
  TemplateNodeDescriptor,
  TemplateValuePart,
} from '../shared/protocol'
import { SandboxCompileError } from '../host/errors'

const expressionTokenPrefix = '__ARROW_SANDBOX_EXPR_'
const expressionTokenSuffix = '__'
const expressionPattern = /__ARROW_SANDBOX_EXPR_(\d+)__/g

function getExpressionToken(index: number) {
  return `${expressionTokenPrefix}${index}${expressionTokenSuffix}`
}

function parseValueParts(source: string): TemplateValuePart[] {
  const parts: TemplateValuePart[] = []
  let cursor = 0

  source.replace(expressionPattern, (match, value, offset) => {
    if (offset > cursor) {
      parts.push({
        kind: 'static',
        value: source.slice(cursor, offset),
      })
    }

    parts.push({
      kind: 'expr',
      exprIndex: Number(value),
    })

    cursor = offset + match.length
    return match
  })

  if (cursor < source.length) {
    parts.push({
      kind: 'static',
      value: source.slice(cursor),
    })
  }

  return parts
}

function isStaticOnly(parts: TemplateValuePart[]) {
  return parts.every((part) => part.kind === 'static')
}

function createStaticTextNodes(value: string): TemplateNodeDescriptor[] {
  return value
    ? [
        {
          kind: 'text',
          value,
        },
      ]
    : []
}

function compileTextNode(node: Text): TemplateNodeDescriptor[] {
  const parts = parseValueParts(node.data)
  const expressionParts = parts.filter((part) => part.kind === 'expr')

  if (!expressionParts.length) {
    return createStaticTextNodes(node.data)
  }

  if (
    expressionParts.length === 1 &&
    parts.every(
      (part) => part.kind === 'expr' || !part.value.trim().length
    )
  ) {
    const nodes: TemplateNodeDescriptor[] = []

    for (const part of parts) {
      if (part.kind === 'static') {
        nodes.push(...createStaticTextNodes(part.value))
        continue
      }

      nodes.push({
        kind: 'region',
        exprIndex: part.exprIndex,
      })
    }

    return nodes
  }

  return [
    {
      kind: 'text-binding',
      parts,
    },
  ]
}

function compileAttributeBinding(
  name: string,
  value: string
): AttributeBindingDescriptor {
  const parts = parseValueParts(value)
  if (!parts.some((part) => part.kind === 'expr')) {
    throw new SandboxCompileError(
      `Expected attribute "${name}" to contain a sandbox expression.`
    )
  }

  return {
    name,
    parts,
  }
}

function compileElementNode(element: Element): ElementDescriptor {
  const staticAttributes: Record<string, string> = {}
  const dynamicAttributes: AttributeBindingDescriptor[] = []
  const eventBindings = []
  let refBinding: { exprIndex: number } | undefined

  for (const name of element.getAttributeNames()) {
    const value = element.getAttribute(name) ?? ''
    const parts = parseValueParts(value)
    const firstExpression =
      parts.length === 1 && parts[0]?.kind === 'expr' ? parts[0] : null

    if (name.startsWith('@')) {
      if (!firstExpression) {
        throw new SandboxCompileError(
          `Event binding "${name}" must be a single expression.`
        )
      }

      eventBindings.push({
        eventType: name.slice(1),
        exprIndex: firstExpression.exprIndex,
      })
      continue
    }

    if (name === 'ref') {
      if (!firstExpression) {
        throw new SandboxCompileError('Sandbox refs must be a single expression.')
      }

      refBinding = {
        exprIndex: firstExpression.exprIndex,
      }
      continue
    }

    if (name.startsWith('.')) {
      throw new SandboxCompileError(
        `IDL property bindings like "${name}" are not supported in @arrow-js/sandbox yet.`
      )
    }

    if (isStaticOnly(parts)) {
      staticAttributes[name] = value
      continue
    }

    dynamicAttributes.push(compileAttributeBinding(name, value))
  }

  const children: TemplateNodeDescriptor[] = []
  for (const child of Array.from(element.childNodes)) {
    children.push(...compileDomNode(child))
  }

  return {
    kind: 'element',
    tag: element.tagName.toLowerCase(),
    staticAttributes,
    dynamicAttributes,
    eventBindings,
    refBinding,
    children,
  }
}

function compileDomNode(node: Node): TemplateNodeDescriptor[] {
  switch (node.nodeType) {
    case node.ELEMENT_NODE:
      return [compileElementNode(node as Element)]
    case node.TEXT_NODE:
      return compileTextNode(node as Text)
    case node.COMMENT_NODE:
      return []
    default:
      throw new SandboxCompileError(
        `Unsupported template node type "${node.nodeType}".`
      )
  }
}

export function compileTemplateDescriptor(
  templateId: string,
  strings: string[]
): TemplateDescriptor {
  if (typeof document === 'undefined') {
    throw new SandboxCompileError(
      '@arrow-js/sandbox requires a DOM-capable environment to compile templates.'
    )
  }

  const html = strings.reduce((result, part, index) => {
    if (index === strings.length - 1) return result + part
    return result + part + getExpressionToken(index)
  }, '')

  const template = document.createElement('template')
  template.innerHTML = html

  const rootCandidates = Array.from(template.content.childNodes)
    .flatMap((node) => compileDomNode(node))
    .filter((node) => !(node.kind === 'text' && !node.value.trim()))

  return {
    id: templateId,
    root:
      rootCandidates.length === 1
        ? rootCandidates[0]
        : {
            kind: 'fragment',
            children: rootCandidates,
          },
  }
}
