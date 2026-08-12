export function mergeValues(lower: unknown, higher: unknown): unknown {
  if (!isPlainObject(lower) || !isPlainObject(higher)) return higher

  const result: Record<string, unknown> = { ...lower }
  for (const [key, value] of Object.entries(higher)) {
    result[key] = Object.hasOwn(lower, key)
      ? mergeValues(lower[key], value)
      : value
  }
  return result
}

export function snapshot<T>(value: T): T {
  return freezeSnapshot(clone(value))
}

export function clone<T>(value: T): T {
  if (value instanceof Date) return new Date(value) as T
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T
  }
  if (!isPlainObject(value)) return value

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, clone(item)]),
  ) as T
}

function freezeSnapshot<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach((item) => freezeSnapshot(item))
    return Object.freeze(value)
  }
  if (!isPlainObject(value)) return value

  Object.values(value).forEach((item) => freezeSnapshot(item))
  return Object.freeze(value) as T
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value) as unknown
  return prototype === Object.prototype || prototype === null
}
