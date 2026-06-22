// ============================================================================
// theme.ts — THE design-tokens file. Colors, spacing, radii, shadows, and motion
// timings all live here so we can re-skin / re-tune the whole game from one spot.
//
// Aesthetic: Super Auto Pets' clean, chunky, friendly 2D charm + the grounded,
// "has weight" intent of Pokémon Champions (soft drop-shadows under everything).
// Bright, saturated, element-coded. Motions are short (150–250ms) and eased.
// ============================================================================

import type { ElementType } from '../engine/types';

export type ElementKey = ElementType;

export interface ElementStyle {
  label: string;
  emoji: string; // type icon for the badge
  main: string; // primary accent
  light: string; // soft fill / tinted background
  dark: string; // deep accent / text-on-light
  from: string; // art-tile gradient start
  to: string; // art-tile gradient end
  glow: string; // colored shadow/glow (rgba)
}

/** Per-element palette. Fire=warm, Water=blue/teal, Nature=green, Earth=brown/tan. */
export const ELEMENTS: Record<ElementKey, ElementStyle> = {
  fire: {
    label: 'Fire',
    emoji: '🔥',
    main: '#f4541d',
    light: '#ffe2d1',
    dark: '#b3360f',
    from: '#ffa758',
    to: '#f24a1c',
    glow: 'rgba(242, 74, 28, 0.45)',
  },
  water: {
    label: 'Water',
    emoji: '💧',
    main: '#1f93cf',
    light: '#d2efff',
    dark: '#0d5f93',
    from: '#5cc8f2',
    to: '#1c87cc',
    glow: 'rgba(28, 135, 204, 0.45)',
  },
  nature: {
    label: 'Nature',
    emoji: '🌿',
    main: '#2faf59',
    light: '#d4f6dd',
    dark: '#1c7a3e',
    from: '#6bdc8b',
    to: '#2bab57',
    glow: 'rgba(43, 171, 87, 0.42)',
  },
  earth: {
    label: 'Earth',
    emoji: '🪨',
    main: '#b07a3c',
    light: '#f0dcc0',
    dark: '#7d5224',
    from: '#d8a866',
    to: '#a9763b',
    glow: 'rgba(169, 118, 59, 0.45)',
  },
};

/** Neutral surface / chrome colors (the "stage" the cards sit on). */
export const SURFACE = {
  bgTop: '#2a2350', // deep twilight purple (top of the stage gradient)
  bgBottom: '#171331', // darker base
  panel: 'rgba(255, 255, 255, 0.06)', // glassy panel fill
  panelBorder: 'rgba(255, 255, 255, 0.12)',
  slotEmpty: 'rgba(255, 255, 255, 0.04)',
  slotBorder: 'rgba(255, 255, 255, 0.16)',
  cardFace: '#fdf6ec', // warm off-white card face (SAP-like)
  cardEdge: '#e7dcc9',
  ink: '#2c2540', // dark text on light cards
  inkSoft: '#6b6385',
  gold: '#ffcf4d',
  heart: '#ff5d6c',
  trophy: '#ffd24a',
  frost: 'rgba(150, 214, 255, 0.55)',
};

/** Corner radii — chunky and rounded. */
export const RADII = {
  card: 18,
  slot: 16,
  pill: 999,
  panel: 24,
};

/** Soft, grounding drop-shadows (the Champions "weight" cue, in 2D). */
export const SHADOW = {
  card: '0 10px 18px -6px rgba(10, 6, 30, 0.55)',
  cardHover: '0 18px 30px -8px rgba(10, 6, 30, 0.6)',
  cardDrag: '0 28px 46px -10px rgba(10, 6, 30, 0.7)',
  creature: 'drop-shadow(0 6px 5px rgba(10, 6, 30, 0.45))', // under the creature art itself
  creatureLift: 'drop-shadow(0 18px 12px rgba(10, 6, 30, 0.5))', // while being dragged
  panel: '0 8px 24px -10px rgba(0, 0, 0, 0.5)',
};

/**
 * SCENE — the "game world" palette: a cartoon meadow stage (sky → mountains →
 * tree-line → striped grass), stone pedestals the pets stand on, wooden signs,
 * and chunky orange wooden buttons. This is what replaces the card chrome.
 */
export const SCENE = {
  skyTop: '#74c7f4',
  skyHorizon: '#cdeeff',
  cloud: 'rgba(255,255,255,0.92)',
  sun: '#fff3c4',
  mountainFar: '#a6c3dc',
  mountainNear: '#86b07f',
  hillsBack: '#3f9f55',
  hillsFront: '#57b95f',
  grassDark: '#54b257',
  grassMid: '#65c163',
  grassLight: '#7ace6f',
  dirt: '#cf9a57',
  dirtDark: '#a9763b',
  stoneTop: '#cfd5de',
  stoneBottom: '#9aa3b2',
  stoneEdge: '#7c8595',
  groundShadow: 'rgba(30,45,30,0.30)',
  wood: '#b97636',
  woodDark: '#7c4a1d',
  sign: '#d2ab6e',
  signDark: '#b78a4e',
  orange: '#ff8d2e',
  orangeDark: '#e9701a',
  orangeEdge: '#bd560f',
  hudShell: '#43321f',
  hudShellLight: '#5d472d',
  parchment: '#fff7e6',
  parchmentEdge: '#e7cfa0',
};

/**
 * Motion tokens. Keep everything short & eased — snappy, never janky.
 * Durations in seconds (Framer Motion).
 */
export const MOTION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number], // easeOutQuint-ish
  // Springs for "poppy" things (buy-in, merge pulse).
  pop: { type: 'spring', stiffness: 520, damping: 24, mass: 0.7 } as const,
  // Softer spring for layout shifts (reorder).
  soft: { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const,
};
