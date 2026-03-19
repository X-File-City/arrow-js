# @arrow-js/sandbox

![ArrowJS](./arrow-logo.png)

ArrowJS sandbox executes user-authored Arrow JavaScript or TypeScript inside an async QuickJS/WASM VM while rendering through trusted host DOM code.

[Docs](https://arrow-js.com) · [API Reference](https://arrow-js.com/api) · [Playground](https://arrow-js.com/play/)

## What this package does

`@arrow-js/sandbox` lets you run untrusted Arrow code without executing that code in the page's `window` realm.

It provides:

- an async QuickJS/WASM runtime for user-authored modules
- AST-based preprocessing for implicit Arrow imports and template extraction
- a sandbox-specific `@arrow-js/core` shim
- a host DOM renderer and delegated event bridge

## Install

```sh
pnpm add @arrow-js/sandbox
```

## Basic usage

```ts
import { sandbox } from '@arrow-js/sandbox'

const code = `
  const state = reactive({ count: 0 })

  export default html\`<button @click="\${() => state.count++}">
    Clicked \${() => state.count}
  </button>\`
`

await sandbox(code, document.getElementById('app')!)
```

Arrow identifiers such as `html` and `reactive` can be auto-injected when they are used as free identifiers. Explicit user imports are preserved.

## Multi-file modules

```ts
await sandbox('', mountPoint, {
  entry: '/App.ts',
  files: {
    '/state.ts': `
      import { reactive } from '@arrow-js/core'
      export const state = reactive({ count: 0 })
    `,
    '/App.ts': `
      import { html } from '@arrow-js/core'
      import { state } from './state.ts'

      export default html\`
        <button @click="\${() => state.count++}">
          Clicked \${() => state.count}
        </button>
      \`
    `,
  },
})
```

Supported virtual imports:

- relative imports between provided virtual files
- `.ts`, `.js`, `.mjs`, and `index.*` fallback resolution
- `@arrow-js/core`, resolved to the sandbox shim

Unsupported imports fail fast. There is no network fetch fallback.

## API

```ts
export interface SandboxOptions {
  files?: Record<string, string>
  entry?: string
  onError?: (error: Error | string) => void
  debug?: boolean
}

export interface SandboxInstance {
  destroy(): void
  update(code: string, options?: Partial<SandboxOptions>): Promise<void>
}

export function sandbox(
  code: string,
  mountPoint: Element,
  options?: SandboxOptions
): Promise<SandboxInstance>
```

`update()` recompiles and boots a fresh VM before swapping the live instance, so a failed update does not partially mutate the current mount.

## Security model

- User-authored logic runs inside QuickJS/WASM.
- The host page mutates the real DOM through trusted renderer code only.
- Event listeners on the real DOM forward sanitized payloads back to the VM.
- The sandbox does not receive direct access to `window`, `document`, DOM nodes, timers, storage, fetch, or arbitrary browser APIs.
- `html` templates are preprocessed into descriptors. The host never evaluates user expressions.
- DOM listeners in the host never attach raw user callbacks from sandbox code.

Explicitly bridged globals currently include `setTimeout`, `clearTimeout`, `setInterval`, and `clearInterval`. The host owns the real timers, but the registered callbacks still execute inside QuickJS.

Event payloads are forwarded as plain data. The VM receives a narrow snapshot, not a live DOM event object.

## Supported subset

- text interpolation
- attribute interpolation
- event bindings such as `@click`
- nested elements
- sync `component()` composition
- `pick()` / `props()` narrowing for component props
- reactive updates inside the VM
- bridged timer callbacks via `setTimeout` and `setInterval`
- arrays and conditional child regions
- multi-root templates without a wrapper element
- `update()` and `destroy()` lifecycle control

## Unsupported or partial

- full `@arrow-js/core` parity
- async `component()` factories
- keyed list diffing
- direct DOM refs or real DOM node access
- arbitrary external imports
- browser API access without an explicit bridge
- hard CPU and memory isolation

## Current limitations

- This is not yet a hard boundary against CPU or memory exhaustion.
- Memory limits are applied to the QuickJS runtime, but denial-of-service hardening still needs more work.
- TypeScript support uses `typescript.transpileModule`, not full semantic type-checking.
- Template support is intentionally narrower than the standard Arrow host runtime.

## Development

```sh
pnpm --filter @arrow-js/sandbox sync:vm
pnpm --filter @arrow-js/sandbox demo
pnpm exec vitest run packages/sandbox/src/index.spec.ts
pnpm exec playwright test -c playwright.sandbox.config.ts
```
