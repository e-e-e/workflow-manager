export function assertUnreachable(v: never, message?: string) {
  throw new Error(message ?? 'Unreachable Path');
}

export function assertExistence<T>(
  v: T | null | undefined,
  message?: string
): asserts v is T {
  if (v == null) throw new Error(message || 'Expected value to exist');
}
