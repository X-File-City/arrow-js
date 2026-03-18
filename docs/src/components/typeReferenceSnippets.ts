import coreComponentSource from '../../../packages/core/src/component.ts?raw'
import coreHtmlSource from '../../../packages/core/src/html.ts?raw'
import coreReactiveSource from '../../../packages/core/src/reactive.ts?raw'
import frameworkBoundarySource from '../../../packages/framework/src/boundary.ts?raw'
import frameworkHttpSource from '../../../packages/framework/src/http.ts?raw'
import frameworkRenderSource from '../../../packages/framework/src/render.ts?raw'
import frameworkSsrSource from '../../../packages/framework/src/ssr.ts?raw'
import hydrateSource from '../../../packages/hydrate/src/index.ts?raw'

function stripComments(source: string) {
  return source
    .replace(/\/\*\*?[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

function extractBlock(source: string, signature: string) {
  const start = source.indexOf(signature)

  if (start === -1) {
    throw new Error(`Unable to find declaration starting with: ${signature}`)
  }

  const end = source.indexOf('\n\n', start)
  return stripComments(source.slice(start, end === -1 ? source.length : end))
}

function joinBlocks(...blocks: string[]) {
  return blocks.join('\n\n')
}

export const coreTypeReferenceSnippet = joinBlocks(
  extractBlock(coreHtmlSource, 'export type ParentNode ='),
  extractBlock(coreHtmlSource, 'export interface ArrowTemplate {'),
  extractBlock(coreHtmlSource, 'export type ArrowTemplateKey ='),
  extractBlock(coreHtmlSource, 'export type ArrowRenderable ='),
  extractBlock(coreHtmlSource, 'export type ArrowFunction ='),
  extractBlock(coreHtmlSource, 'export type ArrowExpression ='),
  extractBlock(coreReactiveSource, 'export type ReactiveTarget ='),
  extractBlock(coreReactiveSource, 'interface ReactiveAPI<T> {'),
  extractBlock(coreReactiveSource, 'export interface Computed<T>'),
  extractBlock(coreReactiveSource, 'type ReactiveValue<T> ='),
  extractBlock(coreReactiveSource, 'export type Reactive<T extends ReactiveTarget> ='),
  extractBlock(coreReactiveSource, 'export interface PropertyObserver<T> {'),
  extractBlock(coreComponentSource, 'export type Props<T extends ReactiveTarget> ='),
  extractBlock(coreComponentSource, 'export type ComponentFactory ='),
  extractBlock(coreComponentSource, 'export interface AsyncComponentOptions<'),
  extractBlock(coreComponentSource, 'export interface ComponentCall {'),
  extractBlock(coreComponentSource, 'export interface Component {'),
  extractBlock(coreComponentSource, 'export interface ComponentWithProps<T extends ReactiveTarget> {')
)

export const frameworkTypeReferenceSnippet = joinBlocks(
  '// ---cut-start---',
  "import type { ArrowTemplate } from '@arrow-js/core'",
  '// ---cut-end---',
  extractBlock(frameworkRenderSource, 'export interface RenderOptions {'),
  extractBlock(frameworkRenderSource, 'export interface RenderPayload {'),
  extractBlock(frameworkRenderSource, 'export interface RenderResult {'),
  extractBlock(frameworkBoundarySource, 'export interface BoundaryOptions {'),
  extractBlock(frameworkHttpSource, 'export interface DocumentRenderParts {')
)

export const ssrTypeReferenceSnippet = joinBlocks(
  extractBlock(frameworkSsrSource, 'export interface HydrationPayload {'),
  extractBlock(frameworkSsrSource, 'export interface SsrRenderOptions {'),
  extractBlock(frameworkSsrSource, 'export interface SsrRenderResult {')
)

export const hydrateTypeReferenceSnippet = joinBlocks(
  '// ---cut-start---',
  "import type { ArrowTemplate, ParentNode } from '@arrow-js/core'",
  "import type { RenderPayload } from '@arrow-js/framework'",
  '// ---cut-end---',
  extractBlock(hydrateSource, 'export interface HydrationPayload {'),
  extractBlock(hydrateSource, 'export interface HydrationMismatchDetails {'),
  extractBlock(hydrateSource, 'export interface HydrationOptions {'),
  extractBlock(hydrateSource, 'export interface HydrationResult {')
)
