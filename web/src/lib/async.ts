/** Los callbacks se esperan en orden, también cuando se ejecutan en una transacción. */
export async function mapSequential<T, U>(items: readonly T[], fn: (value: T, index: number, array: readonly T[]) => Promise<U>): Promise<U[]> {
  const results: U[] = [];
  for (let i = 0; i < items.length; i++) results.push(await fn(items[i], i, items));
  return results;
}
