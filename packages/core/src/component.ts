import type { ArrowTemplate } from './html'
import { reactive } from './reactive'
import type { Reactive, ReactiveTarget } from './reactive'

export type Props<T extends ReactiveTarget> = {
  [P in keyof T]: T[P] extends ReactiveTarget ? Props<T[P]> | T[P] : T[P]
}
type ArrowTemplateKey = string | number | undefined
type SyncFactory<T extends ReactiveTarget> =
  | (() => ArrowTemplate)
  | ((props: Props<T>) => ArrowTemplate)
type AsyncFactory<T extends ReactiveTarget, TValue> =
  | (() => Promise<TValue> | TValue)
  | ((props: Props<T>) => Promise<TValue> | TValue)

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as {
  new (...args: unknown[]): unknown
}

export type ComponentFactory = (props?: Props<ReactiveTarget>) => ArrowTemplate

export interface AsyncComponentOptions<
  TProps extends ReactiveTarget,
  TValue,
  TSnapshot = TValue,
> {
  fallback?: unknown
  onError?: (error: unknown, props: Props<TProps>) => unknown
  render?: (value: TValue, props: Props<TProps>) => unknown
  serialize?: (value: TValue, props: Props<TProps>) => TSnapshot
  deserialize?: (snapshot: TSnapshot, props: Props<TProps>) => TValue
  idPrefix?: string
}

export type AsyncComponentInstaller = <
  TProps extends ReactiveTarget,
  TValue,
  TSnapshot = TValue,
>(
  factory: AsyncFactory<TProps, TValue>,
  options?: AsyncComponentOptions<TProps, TValue, TSnapshot>
) => Component | ComponentWithProps<TProps>

export interface ComponentCall {
  h: ComponentFactory
  p: Props<ReactiveTarget> | undefined
  k: ArrowTemplateKey
  key: (key: ArrowTemplateKey) => ComponentCall
}

export interface Component {
  (): ComponentCall
}

export interface ComponentWithProps<T extends ReactiveTarget> {
  <S extends Props<T>>(props: S): ComponentCall
}

let asyncComponentInstaller: AsyncComponentInstaller | null = null

type SourceBox = Reactive<{
  0: Props<ReactiveTarget> | undefined
  1: ComponentFactory
}>
function setComponentKey(this: ComponentCall, key: ArrowTemplateKey) {
  this.k = key
  return this
}

const propsProxyHandler: ProxyHandler<SourceBox> = {
  get(target, key) {
    const source = target[0]
    if (!source) return
    return (source as Record<PropertyKey, unknown>)[key as PropertyKey]
  },
  set(target, key, value) {
    const source = target[0]
    if (!source) return false
    return Reflect.set(source as object, key, value)
  },
}

const narrowedPropsHandler: ProxyHandler<{
  k: PropertyKey[]
  s: object
}> = {
  get(target, key) {
    return target.k.includes(key)
      ? (target.s as Record<PropertyKey, unknown>)[key as PropertyKey]
      : undefined
  },
  set(target, key, value) {
    if (!target.k.includes(key)) return false
    return Reflect.set(target.s, key, value)
  },
}

export function pick<T extends object, K extends keyof T>(
  source: T,
  ...keys: K[]
): Pick<T, K>
export function pick<T extends object>(
  source: T
): T
export function pick<T extends object, K extends keyof T>(
  source: T,
  ...keys: K[]
): T | Pick<T, K> {
  return keys.length
    ? (new Proxy({
        k: keys as PropertyKey[],
        s: source,
      }, narrowedPropsHandler) as unknown as Pick<T, K>)
    : source
}

export const props = pick

export function component(factory: () => ArrowTemplate): Component
export function component<T extends ReactiveTarget>(
  factory: (props: Props<T>) => ArrowTemplate
): ComponentWithProps<T>
export function component<TValue, TSnapshot = TValue>(
  factory: () => Promise<TValue> | TValue,
  options?: AsyncComponentOptions<ReactiveTarget, TValue, TSnapshot>
): Component
export function component<
  T extends ReactiveTarget,
  TValue,
  TSnapshot = TValue,
>(
  factory: (props: Props<T>) => Promise<TValue> | TValue,
  options?: AsyncComponentOptions<T, TValue, TSnapshot>
): ComponentWithProps<T>
export function component<T extends ReactiveTarget, TValue, TSnapshot = TValue>(
  factory: SyncFactory<T> | AsyncFactory<T, TValue>,
  options?: AsyncComponentOptions<T, TValue, TSnapshot>
): Component | ComponentWithProps<T> {
  if (isAsyncFactory(factory as CallableFunction)) {
    if (!asyncComponentInstaller) {
      throw new Error(
        'Async components require Arrow async runtime support. Import @arrow-js/framework, @arrow-js/ssr, or @arrow-js/hydrate before rendering.'
      )
    }

    return asyncComponentInstaller(
      factory as AsyncFactory<T, TValue>,
      options
    ) as Component | ComponentWithProps<T>
  }

  return ((input?: Props<T>) =>
    ({
      h: factory as SyncFactory<T> as ComponentFactory,
      k: undefined,
      p: input as Props<ReactiveTarget> | undefined,
      key: setComponentKey,
    })) as Component | ComponentWithProps<T>
}

export function installAsyncComponentInstaller(
  installer: AsyncComponentInstaller | null
) {
  asyncComponentInstaller = installer
}

export function isCmp(value: unknown): value is ComponentCall {
  return !!value && typeof value === 'object' && 'h' in value
}

export function createPropsProxy(
  source: Props<ReactiveTarget> | undefined,
  factory: ComponentFactory
): [Props<ReactiveTarget>, SourceBox] {
  const box = reactive({ 0: source, 1: factory })
  return [new Proxy(box, propsProxyHandler) as unknown as Props<ReactiveTarget>, box]
}

function isAsyncFactory(factory: CallableFunction) {
  return factory instanceof AsyncFunction || factory.constructor?.name === 'AsyncFunction'
}
