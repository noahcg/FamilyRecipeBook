export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function pushKeyMatches(existing: ArrayBuffer | null, publicKey: string): boolean {
  if (!existing) return false;
  const current = new Uint8Array(existing);
  const expected = urlBase64ToUint8Array(publicKey);
  return current.length === expected.length && current.every((byte, index) => byte === expected[index]);
}
