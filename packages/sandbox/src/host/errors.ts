export class SandboxCompileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SandboxCompileError'
  }
}

export class SandboxRuntimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SandboxRuntimeError'
  }
}

export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  return new Error(typeof value === 'string' ? value : String(value))
}

export function formatError(value: unknown) {
  const error = toError(value)
  return [error.message, error.stack].filter(Boolean).join('\n')
}

export function toDisplayError(value: unknown): Error {
  const error = toError(value)
  const formatted = formatError(error)

  if (formatted === error.message) {
    return error
  }

  const displayError = new Error(formatted)
  displayError.name = error.name
  return displayError
}
