import {
  DEBUG_ASYNC,
  RELEASE_ASYNC,
  newQuickJSAsyncWASMModule,
} from 'quickjs-emscripten'
import type {
  CompiledSandboxGraph,
} from '../compiler'
import type {
  HostToVmMessage,
  VmInitPayload,
  VmToHostMessage,
} from '../shared/protocol'
import {
  VM_BOOTSTRAP_MODULE_ID,
  VM_CORE_MODULE_ID,
  vmRuntimeModules,
} from '../vm/generated-modules'
import { SandboxRuntimeError } from './errors'

interface VmRunnerOptions {
  compiled: CompiledSandboxGraph
  debug?: boolean
  onMessage: (message: VmToHostMessage) => void
}

interface SandboxTimerRecord {
  callback: any
  args: any[]
  handle: ReturnType<typeof globalThis.setTimeout> | ReturnType<typeof globalThis.setInterval>
  repeat: boolean
}

export interface VmRunner {
  dispatch(message: HostToVmMessage): Promise<void>
  destroy(): void
}

const quickJsModules = new Map<boolean, Promise<Awaited<ReturnType<typeof newQuickJSAsyncWASMModule>>>>()

function normalizeSpecifier(value: string) {
  return value.replace(/\/{2,}/g, '/')
}

function resolveModuleSpecifier(
  baseModuleName: string,
  requestedName: string,
  modules: Record<string, string>
) {
  if (requestedName === '@arrow-js/core') {
    return VM_CORE_MODULE_ID
  }

  if (requestedName.startsWith('/')) {
    const normalized = normalizeSpecifier(requestedName)
    if (normalized in modules) return normalized
    return normalized
  }

  if (requestedName.startsWith('.')) {
    const url = new URL(requestedName, `https://arrow-sandbox.local${baseModuleName}`)
    const normalized = normalizeSpecifier(url.pathname)
    if (normalized in modules) return normalized

    const fallbacks = [
      normalized,
      `${normalized}.ts`,
      `${normalized}.js`,
      `${normalized}.mjs`,
      `${normalized}/index.ts`,
      `${normalized}/index.js`,
      `${normalized}/index.mjs`,
    ]

    const found = fallbacks.find((candidate) => candidate in modules)
    if (found) return found
  }

  throw new SandboxRuntimeError(
    `Unsupported sandbox import "${requestedName}" from "${baseModuleName}".`
  )
}

async function getQuickJsModule(debug = false) {
  let modulePromise = quickJsModules.get(debug)
  if (!modulePromise) {
    modulePromise = newQuickJSAsyncWASMModule(debug ? DEBUG_ASYNC : RELEASE_ASYNC)
    quickJsModules.set(debug, modulePromise)
  }

  return modulePromise
}

function flushPendingJobs(runtime: any, context: any) {
  while (runtime.hasPendingJob()) {
    context.unwrapResult(runtime.executePendingJobs())
  }
}

async function settleHandle(runtime: any, context: any, handle: any) {
  const settledResult = context.resolvePromise(handle)
  flushPendingJobs(runtime, context)
  const settledHandle = context.unwrapResult(await settledResult)
  settledHandle.dispose()
  flushPendingJobs(runtime, context)
}

async function evalModule(runtime: any, context: any, code: string, fileName: string) {
  const result = await context.evalCodeAsync(code, fileName, { type: 'module' })
  const handle = context.unwrapResult(result)
  try {
    await settleHandle(runtime, context, handle)
  } finally {
    handle.dispose()
  }
}

export async function createVmRunner(
  options: VmRunnerOptions
): Promise<VmRunner> {
  const quickJs = await getQuickJsModule(!!options.debug)
  const runtime = quickJs.newRuntime()
  runtime.setMemoryLimit(16 * 1024 * 1024)
  runtime.setMaxStackSize(512 * 1024)

  const context = runtime.newContext()
  let destroyed = false
  let nextTimerId = 0
  const timers = new Map<number, SandboxTimerRecord>()
  const modules = {
    ...vmRuntimeModules,
    ...options.compiled.modules,
  }

  const formatRuntimeError = (error: unknown) =>
    error instanceof Error
      ? [error.message, error.stack].filter(Boolean).join('\n')
      : String(error)

  const disposeTimerRecord = (timer: SandboxTimerRecord) => {
    timer.callback.dispose()
    for (const arg of timer.args) {
      arg.dispose()
    }
  }

  const clearTimer = (timerId: number) => {
    const timer = timers.get(timerId)
    if (!timer) return

    timers.delete(timerId)
    if (timer.repeat) {
      clearInterval(timer.handle as ReturnType<typeof globalThis.setInterval>)
    } else {
      clearTimeout(timer.handle as ReturnType<typeof globalThis.setTimeout>)
    }
    disposeTimerRecord(timer)
  }

  const dispatchToVm = async (message: HostToVmMessage) => {
    if (destroyed) return

    await evalModule(
      runtime,
      context,
      `await globalThis.__arrowSandboxDispatch(${JSON.stringify(message)})`,
      `/__arrow_sandbox/dispatch-${Date.now()}.js`
    )
  }

  const fireTimer = async (timerId: number) => {
    const timer = timers.get(timerId)
    if (!timer || destroyed) return

    if (!timer.repeat) {
      timers.delete(timerId)
      clearTimeout(timer.handle as ReturnType<typeof globalThis.setTimeout>)
    }

    const callback = timer.callback.dup()
    const args = timer.args.map((arg) => arg.dup())

    try {
      const result = context.callFunction(callback, context.undefined, args)
      const returnedHandle = context.unwrapResult(result)
      returnedHandle.dispose()
      flushPendingJobs(runtime, context)
    } catch (error) {
      options.onMessage({
        type: 'error',
        error: formatRuntimeError(error),
      })
    } finally {
      callback.dispose()
      for (const arg of args) {
        arg.dispose()
      }

      if (!timer.repeat) {
        disposeTimerRecord(timer)
      }
    }
  }

  const scheduleTimer = (
    callbackHandle: any,
    delayHandle: any,
    argHandles: any[],
    repeat: boolean
  ) => {
    if (context.typeof(callbackHandle) !== 'function') {
      throw new Error('Sandbox timers require a callable callback.')
    }

    nextTimerId += 1
    const timerId = nextTimerId
    const delayValue = context.getNumber(delayHandle)
    const delay =
      Number.isFinite(delayValue) && delayValue > 0 ? delayValue : 0

    const timerRecord: SandboxTimerRecord = {
      callback: callbackHandle.dup(),
      args: argHandles.map((arg) => arg.dup()),
      handle: repeat
        ? globalThis.setInterval(() => {
            void fireTimer(timerId)
          }, delay)
        : globalThis.setTimeout(() => {
            void fireTimer(timerId)
          }, delay),
      repeat,
    }

    timers.set(timerId, timerRecord)
    return context.newNumber(timerId)
  }

  const hostSend = context.newFunction('__arrowHostSend', (messageHandle: any) => {
    const message = context.getString(messageHandle)
    options.onMessage(JSON.parse(message))
  })
  context.setProp(context.global, '__arrowHostSend', hostSend)
  hostSend.dispose()

  const setTimeoutHandle = context.newFunction(
    'setTimeout',
    (callbackHandle: any, delayHandle: any, ...argHandles: any[]) =>
      scheduleTimer(callbackHandle, delayHandle, argHandles, false)
  )
  context.setProp(context.global, 'setTimeout', setTimeoutHandle)
  setTimeoutHandle.dispose()

  const clearTimeoutHandle = context.newFunction(
    'clearTimeout',
    (timerIdHandle: any) => {
      clearTimer(context.getNumber(timerIdHandle))
    }
  )
  context.setProp(context.global, 'clearTimeout', clearTimeoutHandle)
  clearTimeoutHandle.dispose()

  const setIntervalHandle = context.newFunction(
    'setInterval',
    (callbackHandle: any, delayHandle: any, ...argHandles: any[]) =>
      scheduleTimer(callbackHandle, delayHandle, argHandles, true)
  )
  context.setProp(context.global, 'setInterval', setIntervalHandle)
  setIntervalHandle.dispose()

  const clearIntervalHandle = context.newFunction(
    'clearInterval',
    (timerIdHandle: any) => {
      clearTimer(context.getNumber(timerIdHandle))
    }
  )
  context.setProp(context.global, 'clearInterval', clearIntervalHandle)
  clearIntervalHandle.dispose()

  runtime.setModuleLoader(
    (moduleName: string) => {
      const source = modules[moduleName]
      if (!source) {
        throw new SandboxRuntimeError(`Unknown sandbox module "${moduleName}".`)
      }
      return source
    },
    (baseModuleName: string, requestedName: string) =>
      resolveModuleSpecifier(baseModuleName, requestedName, modules)
  )

  await evalModule(
    runtime,
    context,
    `import ${JSON.stringify(VM_BOOTSTRAP_MODULE_ID)}`,
    '/__arrow_sandbox/bootstrap-loader.js'
  )

  const initPayload: VmInitPayload = {
    entryPath: options.compiled.entryPath,
    descriptors: options.compiled.descriptors,
    debug: options.debug,
  }

  await evalModule(
    runtime,
    context,
    `await globalThis.__arrowSandboxInit(${JSON.stringify(initPayload)})`,
    '/__arrow_sandbox/init.js'
  )

  return {
    async dispatch(message: HostToVmMessage) {
      await dispatchToVm(message)
    },
    destroy() {
      try {
        destroyed = true
        for (const timerId of Array.from(timers.keys())) {
          clearTimer(timerId)
        }
        try {
          const result = context.evalCode(
            'globalThis.__arrowHostSend = undefined; globalThis.console = undefined; globalThis.setTimeout = undefined; globalThis.clearTimeout = undefined; globalThis.setInterval = undefined; globalThis.clearInterval = undefined;'
          )
          context.unwrapResult(result).dispose()
        } catch {}
        context.dispose()
      } finally {
        runtime.dispose()
      }
    },
  }
}
