type ReactiveTarget = Record<PropertyKey, unknown> | unknown[]
type EffectRunner = {
  active: boolean
  deps: Set<EffectRunner>[]
  run: () => unknown
}

const proxyCache = new WeakMap<object, unknown>()
const targetMap = new WeakMap<object, Map<PropertyKey, Set<EffectRunner>>>()
let activeEffect: EffectRunner | null = null

function isObject(value: unknown): value is ReactiveTarget {
  return value !== null && typeof value === 'object'
}

function cleanupEffect(effect: EffectRunner) {
  for (const dep of effect.deps) {
    dep.delete(effect)
  }

  effect.deps.length = 0
}

function track(target: object, key: PropertyKey) {
  if (!activeEffect) return

  let propertyMap = targetMap.get(target)
  if (!propertyMap) {
    propertyMap = new Map()
    targetMap.set(target, propertyMap)
  }

  let effects = propertyMap.get(key)
  if (!effects) {
    effects = new Set()
    propertyMap.set(key, effects)
  }

  if (effects.has(activeEffect)) return
  effects.add(activeEffect)
  activeEffect.deps.push(effects)
}

function trigger(target: object, key: PropertyKey) {
  const propertyMap = targetMap.get(target)
  const effects = propertyMap?.get(key)
  if (!effects?.size) return

  const queue = Array.from(effects)
  for (const effect of queue) {
    if (!effect.active) continue
    effect.run()
  }
}

function createRunner<T>(effect: () => T, afterEffect?: (value: T) => unknown) {
  const runner: EffectRunner = {
    active: true,
    deps: [],
    run: () => {
      if (!runner.active) return undefined
      cleanupEffect(runner)
      const previous = activeEffect
      activeEffect = runner

      try {
        const result = effect()
        return afterEffect ? afterEffect(result) : result
      } finally {
        activeEffect = previous
      }
    },
  }

  return runner
}

export function reactive<T extends ReactiveTarget>(value: T): T {
  if (!isObject(value)) {
    throw new Error('sandbox reactive() expects an object or array.')
  }

  const existing = proxyCache.get(value as object)
  if (existing) return existing as T

  const proxy = new Proxy(value, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      track(target, key)
      return isObject(result) ? reactive(result) : result
    },
    set(target, key, nextValue, receiver) {
      const previous = Reflect.get(target, key, receiver)
      const valueToStore = isObject(nextValue) ? reactive(nextValue) : nextValue
      const didSet = Reflect.set(target, key, valueToStore, receiver)
      if (!Object.is(previous, valueToStore)) {
        trigger(target, key)
        if (Array.isArray(target) && key !== 'length') {
          trigger(target, 'length')
        }
      }
      return didSet
    },
  })

  proxyCache.set(value as object, proxy)
  proxyCache.set(proxy as object, proxy)
  return proxy
}

export function watch<T>(
  effect: () => T,
  afterEffect?: (value: T) => unknown
): [returnValue: unknown, stop: () => void] {
  const runner = createRunner(effect, afterEffect)
  const stop = () => {
    runner.active = false
    cleanupEffect(runner)
  }

  return [runner.run(), stop]
}

export function nextTick(fn?: CallableFunction) {
  return Promise.resolve().then(() => fn?.())
}
