// Stable per-instance "phase" in [0,1) so each creature's idle loop is offset
// (the board doesn't pulse in unison). Deterministic from the instance id.
export function phaseFor(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  }
  return (h % 1000) / 1000;
}
