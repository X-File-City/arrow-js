import type { SandboxOptions } from '../shared/protocol'
import { SandboxCompileError } from '../host/errors'

export interface NormalizedSandboxGraph {
  entryPath: string
  files: Record<string, string>
}

export function normalizeVirtualPath(value: string) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/{2,}/g, '/')
}

export function normalizeSandboxGraph(
  code: string,
  options: SandboxOptions = {}
): NormalizedSandboxGraph {
  const entryPath = normalizeVirtualPath(options.entry || '/entry.ts')
  const files: Record<string, string> = {}

  for (const [name, source] of Object.entries(options.files || {})) {
    files[normalizeVirtualPath(name)] = source
  }

  if (!options.files || code.trim() || !files[entryPath]) {
    files[entryPath] = code
  }

  if (!(entryPath in files)) {
    throw new SandboxCompileError(
      `Missing sandbox entry module "${entryPath}".`
    )
  }

  return {
    entryPath,
    files,
  }
}
