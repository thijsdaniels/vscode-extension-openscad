export function mapObject<K extends string, V, O extends Record<K, V>, R>(
  obj: O,
  fn: ([key, value]: [keyof O, O[keyof O]]) => R,
): R[] {
  return Object.entries(obj).map(([key, value]) =>
    fn([key as keyof O, value as O[keyof O]]),
  );
}
