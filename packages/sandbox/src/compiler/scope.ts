export interface Scope {
  kind: 'module' | 'function' | 'block'
  parent: Scope | null
  names: Set<string>
}

export interface ScopeAnalysis {
  programScope: Scope
  scopeByNode: WeakMap<object, Scope>
  isBound(node: object, name: string): boolean
  isNameBound(scope: Scope, name: string): boolean
}

export type ESTreeNode = {
  type: string
  start?: number
  end?: number
  [key: string]: unknown
}

function isNode(value: unknown): value is ESTreeNode {
  return !!value && typeof value === 'object' && 'type' in value
}

function createScope(
  kind: Scope['kind'],
  parent: Scope | null,
  scopeByNode: WeakMap<object, Scope>,
  node: object
) {
  const scope: Scope = {
    kind,
    parent,
    names: new Set(),
  }
  scopeByNode.set(node, scope)
  return scope
}

function nearestVarScope(scope: Scope) {
  let current: Scope | null = scope

  while (current && current.kind === 'block') {
    current = current.parent
  }

  return current || scope
}

function declareName(scope: Scope, name: string) {
  scope.names.add(name)
}

function declarePattern(node: unknown, scope: Scope, kind: 'var' | 'block') {
  if (!isNode(node)) return

  switch (node.type) {
    case 'Identifier':
      declareName(kind === 'var' ? nearestVarScope(scope) : scope, node.name as string)
      return
    case 'RestElement':
      declarePattern(node.argument, scope, kind)
      return
    case 'AssignmentPattern':
      declarePattern(node.left, scope, kind)
      return
    case 'ArrayPattern':
      for (const element of node.elements as unknown[]) {
        declarePattern(element, scope, kind)
      }
      return
    case 'ObjectPattern':
      for (const property of node.properties as unknown[]) {
        if (!isNode(property)) continue
        if (property.type === 'Property') {
          declarePattern(property.value, scope, kind)
        } else if (property.type === 'RestElement') {
          declarePattern(property.argument, scope, kind)
        }
      }
      return
  }
}

function visitChildren(node: ESTreeNode, visitor: (child: ESTreeNode) => void) {
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isNode(entry)) visitor(entry)
      }
      continue
    }

    if (isNode(value)) visitor(value)
  }
}

function buildScopes(
  node: ESTreeNode,
  currentScope: Scope,
  scopeByNode: WeakMap<object, Scope>
) {
  let scope = currentScope

  switch (node.type) {
    case 'Program':
      scope = scopeByNode.get(node) || currentScope
      break
    case 'BlockStatement':
    case 'SwitchStatement':
    case 'CatchClause':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
      scope = createScope('block', currentScope, scopeByNode, node)
      if (node.type === 'CatchClause') {
        declarePattern(node.param, scope, 'block')
      }
      break
    case 'FunctionDeclaration':
      if (node.id) {
        declarePattern(node.id, currentScope, 'var')
      }
      scope = createScope('function', currentScope, scopeByNode, node)
      if (node.id) declarePattern(node.id, scope, 'var')
      for (const param of node.params as unknown[]) {
        declarePattern(param, scope, 'block')
      }
      break
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      scope = createScope('function', currentScope, scopeByNode, node)
      if ('id' in node && node.id) declarePattern(node.id, scope, 'var')
      for (const param of node.params as unknown[]) {
        declarePattern(param, scope, 'block')
      }
      break
    case 'ClassDeclaration':
      if (node.id) declarePattern(node.id, currentScope, 'block')
      break
    case 'VariableDeclaration':
      for (const declaration of node.declarations as ESTreeNode[]) {
        declarePattern(
          declaration.id,
          currentScope,
          node.kind === 'var' ? 'var' : 'block'
        )
      }
      break
    case 'ImportDeclaration':
      for (const specifier of node.specifiers as ESTreeNode[]) {
        declarePattern(specifier.local, currentScope, 'block')
      }
      break
  }

  visitChildren(node, (child) => buildScopes(child, scope, scopeByNode))
}

function isReferenceIdentifier(node: ESTreeNode, parent: ESTreeNode | null) {
  if (node.type !== 'Identifier' || !parent) return false

  switch (parent.type) {
    case 'ImportSpecifier':
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return false
    case 'VariableDeclarator':
      return parent.id !== node
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return !(
        parent.id === node ||
        (Array.isArray(parent.params) && parent.params.includes(node))
      )
    case 'ClassDeclaration':
    case 'ClassExpression':
      return parent.id !== node
    case 'Property':
      if (parent.shorthand) return true
      return parent.computed || parent.value === node
    case 'MethodDefinition':
    case 'PropertyDefinition':
      return parent.computed
    case 'MemberExpression':
    case 'OptionalMemberExpression':
      return parent.object === node || !!parent.computed
    case 'ExportSpecifier':
      return false
    case 'CatchClause':
      return parent.param !== node
  }

  return true
}

function resolveScopeForNode(
  node: ESTreeNode,
  parentScope: Scope,
  scopeByNode: WeakMap<object, Scope>
) {
  return scopeByNode.get(node) || parentScope
}

export function analyzeScopes(program: ESTreeNode): ScopeAnalysis {
  const scopeByNode = new WeakMap<object, Scope>()
  const programScope = createScope('module', null, scopeByNode, program)

  buildScopes(program, programScope, scopeByNode)

  return {
    programScope,
    scopeByNode,
    isBound(node: object, name: string) {
      let scope: Scope | null = scopeByNode.get(node) || programScope
      while (scope) {
        if (scope.names.has(name)) return true
        scope = scope.parent
      }
      return false
    },
    isNameBound(scope: Scope, name: string) {
      let current: Scope | null = scope
      while (current) {
        if (current.names.has(name)) return true
        current = current.parent
      }
      return false
    },
  }
}

export function collectReferences(
  program: ESTreeNode,
  analysis: ScopeAnalysis,
  visit: (node: ESTreeNode, scope: Scope, parent: ESTreeNode | null) => void
) {
  const walk = (
    node: ESTreeNode,
    scope: Scope,
    parent: ESTreeNode | null
  ) => {
    const nextScope = resolveScopeForNode(node, scope, analysis.scopeByNode)
    visit(node, nextScope, parent)
    visitChildren(node, (child) => walk(child, nextScope, node))
  }

  walk(program, analysis.programScope, null)
}

export function isUnboundIdentifier(
  node: ESTreeNode,
  parent: ESTreeNode | null,
  scope: Scope,
  analysis: ScopeAnalysis
) {
  return (
    isReferenceIdentifier(node, parent) &&
    !analysis.isBound(scope as unknown as object, node.name as string)
  )
}
