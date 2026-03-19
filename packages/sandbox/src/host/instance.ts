import type {
  HostToVmMessage,
  SandboxInstance,
  SandboxOptions,
  SerializedNode,
  VmToHostMessage,
} from '../shared/protocol'
import { compileSandboxGraph } from '../compiler'
import { createVmRunner, type VmRunner } from './quickjs'
import { HostRenderer } from './renderer'
import { formatError, toDisplayError } from './errors'

interface BootResult {
  runner: VmRunner
  initialTree: SerializedNode
}

class SandboxController implements SandboxInstance {
  private options: SandboxOptions
  private readonly mountPoint: Element
  private readonly renderer: HostRenderer
  private runner: VmRunner | null = null

  constructor(mountPoint: Element, options: SandboxOptions = {}) {
    this.mountPoint = mountPoint
    this.options = options
    this.renderer = new HostRenderer({
      mountPoint,
      onEvent: (handlerId, payload) =>
        this.dispatch({
          type: 'event',
          payload: {
            handlerId,
            event: payload,
          },
        }),
      onError: (error) => this.handleError(error),
    })
  }

  async mount(code: string, options: SandboxOptions = {}) {
    this.options = options
    const booted = await this.boot(code, options)
    this.runner?.destroy()
    this.runner = booted.runner
    this.renderer.render(booted.initialTree)
  }

  async update(code: string, options: Partial<SandboxOptions> = {}) {
    const nextOptions = {
      ...this.options,
      ...options,
      files: options.files ?? this.options.files,
      entry: options.entry ?? this.options.entry,
      onError: options.onError ?? this.options.onError,
      debug: options.debug ?? this.options.debug,
    }

    const booted = await this.boot(code, nextOptions)
    this.options = nextOptions

    this.runner?.destroy()
    this.runner = booted.runner
    this.renderer.render(booted.initialTree)
  }

  destroy() {
    this.runner?.destroy()
    this.runner = null
    this.renderer.destroy()
  }

  private async boot(
    code: string,
    options: SandboxOptions
  ): Promise<BootResult> {
    const compiled = compileSandboxGraph(code, options)
    let initialTree: SerializedNode | null = null
    let activated = false

    const runner = await createVmRunner({
      compiled,
      debug: options.debug,
      onMessage: (message) => {
        switch (message.type) {
          case 'render':
            if (!activated) {
              initialTree = message.tree
              return
            }
            this.renderer.render(message.tree)
            return
          case 'patch':
            if (!activated) return
            this.renderer.applyPatches(message.patches)
            return
          case 'error':
            this.handleError(message.error)
            return
          case 'log':
            if (!options.debug) return
            if (message.method === 'trace') {
              console.log(...message.args)
              return
            }
            {
              const method = (
                console as unknown as Record<string, ((...args: unknown[]) => void) | undefined>
              )[message.method]
              if (typeof method === 'function') {
                method.apply(console, message.args)
                return
              }
            }
            console.log(...message.args)
            return
          case 'ready':
            return
        }
      },
    })

    if (!initialTree) {
      runner.destroy()
      throw new Error('Sandbox VM did not emit an initial render tree.')
    }

    activated = true
    return {
      runner,
      initialTree,
    }
  }

  private async dispatch(message: HostToVmMessage) {
    if (!this.runner) return

    try {
      await this.runner.dispatch(message)
    } catch (error) {
      this.handleError(error)
    }
  }

  private handleError(error: unknown) {
    this.options.onError?.(toDisplayError(error))
    if (!this.options.onError) {
      console.error(formatError(error))
    }
  }
}

export async function sandbox(
  code: string,
  mountPoint: Element,
  options: SandboxOptions = {}
): Promise<SandboxInstance> {
  const controller = new SandboxController(mountPoint, options)
  await controller.mount(code, options)
  return controller
}
