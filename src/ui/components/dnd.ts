// Shared drag payload types for the scene's @dnd-kit interactions.
export type DragData =
  | { kind: 'shop-monster'; slot: number }
  | { kind: 'shop-item'; slot: number }
  | { kind: 'team'; index: number };
