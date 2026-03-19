import { afterEach, describe, expect, it, vi } from 'vitest'
import { sandbox } from '@arrow-js/sandbox'

function waitForSandbox() {
  return new Promise((resolve) => setTimeout(resolve, 25))
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__sandboxTouched
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('@arrow-js/sandbox', () => {
  it('mounts a simple button with implicit Arrow imports', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 0 })
        export default html\`<button @click="\${() => state.count++}">Clicked \${() => state.count}</button>\`
      `,
      root
    )

    const button = root.querySelector('button')
    expect(button?.textContent).toBe('Clicked 0')
    expect(button?.onclick).toBe(null)
    expect(button?.getAttribute('onclick')).toBe(null)

    instance.destroy()
  })

  it('updates reactive text through the VM event path', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 0 })
        export default html\`<button @click="\${() => state.count++}">Clicked \${() => state.count}</button>\`
      `,
      root
    )

    const button = root.querySelector('button') as HTMLButtonElement
    button.click()
    await waitForSandbox()

    expect(button.textContent).toBe('Clicked 1')
    instance.destroy()
  })

  it('keeps user event handlers inside the VM instead of the host window', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 0 })

        export default html\`
          <button @click="\${() => {
            globalThis.__sandboxTouched = (globalThis.__sandboxTouched ?? 0) + 1
            state.count++
          }}">
            Count \${() => state.count}
          </button>
        \`
      `,
      root
    )

    const button = root.querySelector('button') as HTMLButtonElement
    expect((globalThis as Record<string, unknown>).__sandboxTouched).toBeUndefined()
    expect(button.onclick).toBe(null)

    button.click()
    await waitForSandbox()

    expect(button.textContent?.trim()).toBe('Count 1')
    expect((globalThis as Record<string, unknown>).__sandboxTouched).toBeUndefined()
    instance.destroy()
  })

  it('supports multi-file modules with explicit imports', async () => {
    const root = document.createElement('div')

    const instance = await sandbox('', root, {
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
            <div>
              <button @click="\${() => state.count++}">+</button>
              <span>\${() => state.count}</span>
            </div>
          \`
        `,
      },
    })

    const button = root.querySelector('button') as HTMLButtonElement
    button.click()
    await waitForSandbox()

    expect(root.querySelector('span')?.textContent).toBe('1')
    instance.destroy()
  })

  it('supports attribute interpolation updates', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ disabled: false })

        export default html\`
          <button
            disabled="\${() => state.disabled}"
            @click="\${() => (state.disabled = true)}"
          >
            \${() => (state.disabled ? 'Done' : 'Click me')}
          </button>
        \`
      `,
      root
    )

    const button = root.querySelector('button') as HTMLButtonElement
    expect(button.hasAttribute('disabled')).toBe(false)
    button.click()
    await waitForSandbox()

    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.textContent?.trim()).toBe('Done')
    instance.destroy()
  })

  it('supports sandboxed setTimeout callbacks', async () => {
    vi.useFakeTimers()

    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 0 })

        setTimeout(() => {
          state.count = 1
        }, 10)

        export default html\`<span>\${() => state.count}</span>\`
      `,
      root
    )

    expect(root.textContent).toBe('0')
    await vi.advanceTimersByTimeAsync(10)

    expect(root.textContent).toBe('1')
    instance.destroy()
  })

  it('supports sync sandbox components with reactive props and local state', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 1 })

        const Counter = component((props) => {
          const local = reactive({ clicks: 0 })

          return html\`
            <button
              class="child"
              @click="\${() => local.clicks++}"
            >
              \${() => props.count}|\${() => local.clicks}
            </button>
          \`
        })

        export default html\`
          <div>
            <button class="parent" @click="\${() => state.count++}">inc</button>
            \${Counter(state)}
          </div>
        \`
      `,
      root
    )

    const parent = root.querySelector('.parent') as HTMLButtonElement
    const child = root.querySelector('.child') as HTMLButtonElement

    expect(child.textContent?.trim()).toBe('1|0')

    child.click()
    await waitForSandbox()
    expect(child.textContent?.trim()).toBe('1|1')

    parent.click()
    await waitForSandbox()
    expect(child.textContent?.trim()).toBe('2|1')

    instance.destroy()
  })

  it('supports sandbox components without props', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const Static = component(() => html\`<section>hello</section>\`)
        export default html\`<main>\${Static()}</main>\`
      `,
      root
    )

    expect(root.querySelector('main > section')?.textContent).toBe('hello')
    instance.destroy()
  })

  it('supports sandboxed setInterval and clearInterval callbacks', async () => {
    vi.useFakeTimers()

    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 0 })
        const timer = setInterval(() => {
          state.count++
          if (state.count >= 2) {
            clearInterval(timer)
          }
        }, 5)

        export default html\`<span>\${() => state.count}</span>\`
      `,
      root
    )

    expect(root.textContent).toBe('0')
    await vi.advanceTimersByTimeAsync(10)
    expect(root.textContent).toBe('2')

    await vi.advanceTimersByTimeAsync(20)
    expect(root.textContent).toBe('2')
    instance.destroy()
  })

  it('supports setTimeout during top-level await module initialization', async () => {
    vi.useFakeTimers()

    const root = document.createElement('div')

    const pendingInstance = sandbox(
      `
        await new Promise((resolve) => setTimeout(resolve, 10))
        export default html\`<span>ready</span>\`
      `,
      root
    )

    await vi.advanceTimersByTimeAsync(10)
    const instance = await pendingInstance

    expect(root.textContent).toBe('ready')
    instance.destroy()
  })

  it('allows multi-root html blocks without injecting a wrapper element', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 0 })

        export default html\`
          <button @click="\${() => state.count++}">+</button>
          <span>\${() => state.count}</span>
        \`
      `,
      root
    )

    expect(root.children.length).toBe(2)
    expect(root.firstElementChild?.tagName).toBe('BUTTON')
    expect(root.lastElementChild?.tagName).toBe('SPAN')
    expect(root.querySelector('span')?.textContent).toBe('0')

    const button = root.querySelector('button') as HTMLButtonElement
    button.click()
    await waitForSandbox()

    expect(root.querySelector('span')?.textContent).toBe('1')
    instance.destroy()
  })

  it('updates with a fresh module graph and does not leak prior handlers or state', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 0 })
        export default html\`<button @click="\${() => state.count++}">First \${() => state.count}</button>\`
      `,
      root
    )

    const firstButton = root.querySelector('button') as HTMLButtonElement
    firstButton.click()
    await waitForSandbox()
    expect(firstButton.textContent).toBe('First 1')

    await instance.update(`
      const state = reactive({ count: 10 })
      export default html\`<button @click="\${() => (state.count += 2)}">Second \${() => state.count}</button>\`
    `)

    const secondButton = root.querySelector('button') as HTMLButtonElement
    expect(secondButton.textContent).toBe('Second 10')

    firstButton.click()
    await waitForSandbox()
    expect(secondButton.textContent).toBe('Second 10')

    secondButton.click()
    await waitForSandbox()
    expect(secondButton.textContent).toBe('Second 12')

    instance.destroy()
  })

  it('destroys cleanly and clears the mount point', async () => {
    const root = document.createElement('div')

    const instance = await sandbox(
      `
        const state = reactive({ count: 0 })
        export default html\`<button @click="\${() => state.count++}">\${() => state.count}</button>\`
      `,
      root
    )

    expect(root.querySelector('button')).not.toBe(null)
    instance.destroy()
    expect(root.innerHTML).toBe('')
  })

  it('surfaces invalid code errors', async () => {
    const root = document.createElement('div')
    const onError = vi.fn()

    await expect(
      sandbox(
        `
          export default html\`<div>\${</div>\`
        `,
        root,
        { onError }
      )
    ).rejects.toThrow(/Unexpected|Unterminated|Expression expected|Type expected/i)

    expect(onError).not.toHaveBeenCalled()
  })

  it('includes location information in runtime errors passed to onError', async () => {
    const root = document.createElement('div')
    const onError = vi.fn()

    const instance = await sandbox(
      `
        export default html\`
          <button @click="\${() => {
            throw new Error('not a number')
          }}">
            break
          </button>
        \`
      `,
      root,
      { onError }
    )

    const button = root.querySelector('button') as HTMLButtonElement
    button.click()
    await waitForSandbox()

    expect(onError).toHaveBeenCalledTimes(1)
    const payload = onError.mock.calls[0]?.[0]
    const message = typeof payload === 'string' ? payload : payload?.message

    expect(message).toMatch(/not a number/i)
    expect(message).toMatch(/entry\.ts:\d+:\d+/i)
    instance.destroy()
  })

  it('supports expanded sandbox console methods in debug mode', async () => {
    const root = document.createElement('div')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const group = vi.spyOn(console, 'group').mockImplementation(() => {})
    const groupEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    const time = vi.spyOn(console, 'time').mockImplementation(() => {})
    const timeEnd = vi.spyOn(console, 'timeEnd').mockImplementation(() => {})
    const assert = vi.spyOn(console, 'assert').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    const instance = await sandbox(
      `
        console.info('info')
        console.debug('debug')
        console.group('group')
        console.groupEnd()
        console.time('timer')
        console.timeEnd('timer')
        console.assert(false, 'assertion failed')
        console.trace('trace marker')

        export default html\`<div>ok</div>\`
      `,
      root,
      { debug: true }
    )

    expect(info).toHaveBeenCalledWith('info')
    expect(debug).toHaveBeenCalledWith('debug')
    expect(group).toHaveBeenCalledWith('group')
    expect(groupEnd).toHaveBeenCalled()
    expect(time).toHaveBeenCalledWith('timer')
    expect(timeEnd).toHaveBeenCalledWith('timer')
    expect(assert).toHaveBeenCalledWith(false, 'assertion failed')
    expect(
      log.mock.calls.some(
        (call) =>
          call[0] === 'trace marker' &&
          call.some(
            (value) =>
              typeof value === 'string' && /entry\.ts:\d+:\d+/i.test(value)
          )
      )
    ).toBe(true)

    instance.destroy()
  })
})
