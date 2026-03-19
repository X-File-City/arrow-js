import MagicString from 'magic-string'
import { parse } from 'acorn'
import {
  analyzeScopes,
  collectReferences,
  isUnboundIdentifier,
} from './scope'
import type { ESTreeNode } from './scope'
import { compileTemplateDescriptor } from './template'
import type { TemplateDescriptor } from '../shared/protocol'
import { SandboxCompileError } from '../host/errors'

const supportedImports = new Set([
  'component',
  'c',
  'html',
  't',
  'pick',
  'props',
  'reactive',
  'r',
  'watch',
  'w',
  'nextTick',
])

export interface PreprocessedModule {
  code: string
  descriptors: TemplateDescriptor[]
}

function asNode(value: unknown): ESTreeNode | null {
  if (!value || typeof value !== 'object' || !('type' in value)) return null
  return value as ESTreeNode
}

function readImportBindings(program: ESTreeNode) {
  const coreLocals = new Map<string, string>()
  let lastImportEnd = 0

  for (const statement of program.body as ESTreeNode[]) {
    if (statement.type !== 'ImportDeclaration') continue
    lastImportEnd = Math.max(lastImportEnd, statement.end || 0)
    if ((statement.source as any)?.value !== '@arrow-js/core') continue

    for (const specifier of statement.specifiers as any[]) {
      if (specifier.type !== 'ImportSpecifier') {
        throw new SandboxCompileError(
          '@arrow-js/sandbox only supports named imports from @arrow-js/core.'
        )
      }

      const imported = String((specifier.imported as any).name)
      const local = String((specifier.local as any).name)

      if (!supportedImports.has(imported)) {
        throw new SandboxCompileError(
          `Unsupported @arrow-js/core import "${imported}" in sandbox module.`
        )
      }

      coreLocals.set(local, imported)
    }
  }

  return {
    coreLocals,
    lastImportEnd,
  }
}

function isArrowTagIdentifier(
  node: ESTreeNode,
  coreLocals: Map<string, string>,
  missingImports: Set<string>,
  isBound: (name: string) => boolean
) {
  if (node.type !== 'Identifier') return false

  const local = String(node.name)
  const imported = coreLocals.get(local)
  if (imported === 'html' || imported === 't') return true

  if ((local === 'html' || local === 't') && !isBound(local)) {
    missingImports.add(local)
    return true
  }

  return false
}

export function preprocessModule(
  source: string,
  path: string
): PreprocessedModule {
  const program = parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
  }) as unknown as ESTreeNode
  const analysis = analyzeScopes(program)
  const { coreLocals, lastImportEnd } = readImportBindings(program)
  const missingImports = new Set<string>()
  const descriptors: TemplateDescriptor[] = []
  const taggedTemplates: ESTreeNode[] = []

  collectReferences(program, analysis, (node, scope, parent) => {
    if (
      node.type === 'Identifier' &&
      supportedImports.has(String(node.name)) &&
      isUnboundIdentifier(node, parent, scope, analysis)
    ) {
      missingImports.add(String(node.name))
    }

    if (node.type === 'TaggedTemplateExpression') {
      const tag = asNode(node.tag)
      const isBound = (name: string) => analysis.isNameBound(scope, name)

      if (tag && isArrowTagIdentifier(tag, coreLocals, missingImports, isBound)) {
        taggedTemplates.push(node)
        return
      }

      if (
        tag?.type === 'MemberExpression' &&
        asNode(tag.object)?.type === 'Identifier' &&
        coreLocals.has(String(asNode(tag.object)?.name))
      ) {
        throw new SandboxCompileError(
          'Namespace-style Arrow html tags are not supported in @arrow-js/sandbox.'
        )
      }
    }
  })

  const output = new MagicString(source)

  taggedTemplates.sort((left, right) => (right.start || 0) - (left.start || 0))
  let templateIndex = 0

  for (const expression of taggedTemplates) {
    const quasi = expression.quasi as ESTreeNode
    const strings = (quasi.quasis as ESTreeNode[]).map((part) =>
      String((part.value as any).cooked ?? (part.value as any).raw ?? '')
    )
    const expressionSources = (quasi.expressions as ESTreeNode[]).map((part) =>
      source.slice(part.start || 0, part.end || 0)
    )
    const descriptorId = `${path}#template:${templateIndex++}`
    descriptors.push(compileTemplateDescriptor(descriptorId, strings))

    output.overwrite(
      expression.start || 0,
      expression.end || 0,
      `__arrowSandboxTemplate(${JSON.stringify(descriptorId)}, [${expressionSources.join(', ')}])`
    )
  }

  if (missingImports.size) {
    const importStatement = `import { ${Array.from(missingImports).sort().join(', ')} } from '@arrow-js/core'\n`
    output.appendLeft(lastImportEnd, lastImportEnd ? `\n${importStatement}` : importStatement)
  }

  return {
    code: output.toString(),
    descriptors,
  }
}
