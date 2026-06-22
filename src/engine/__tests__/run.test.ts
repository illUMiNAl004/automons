import { describe, it, expect } from 'vitest';
import { applyOutcome, isRunOver } from '../run';
import { createRun } from '../shop';
import { CONFIG } from '../config';

describe('applyOutcome (DESIGN.md §1)', () => {
  it('win → +1 trophy, lives unchanged', () => {
    const s = applyOutcome(createRun(1), 'A');
    expect(s.trophies).toBe(1);
    expect(s.lives).toBe(CONFIG.startingLives);
    expect(s.lastResult).toBe('A');
  });

  it('loss → −1 life, trophies unchanged', () => {
    const s = applyOutcome(createRun(1), 'B');
    expect(s.lives).toBe(CONFIG.startingLives - 1);
    expect(s.trophies).toBe(0);
  });

  it('draw → nothing changes', () => {
    const base = createRun(1);
    const s = applyOutcome(base, 'draw');
    expect(s.lives).toBe(base.lives);
    expect(s.trophies).toBe(base.trophies);
    expect(s.phase).toBe('result');
  });

  it('reaching the trophy goal wins the run', () => {
    const nearWin = { ...createRun(1), trophies: CONFIG.winTrophies - 1 };
    const s = applyOutcome(nearWin, 'A');
    expect(s.trophies).toBe(CONFIG.winTrophies);
    expect(s.phase).toBe('won');
    expect(isRunOver(s)).toBe(true);
  });

  it('dropping to 0 lives loses the run', () => {
    const nearLoss = { ...createRun(1), lives: 1 };
    const s = applyOutcome(nearLoss, 'B');
    expect(s.lives).toBe(0);
    expect(s.phase).toBe('lost');
    expect(isRunOver(s)).toBe(true);
  });

  it('ongoing battles stay in the result phase', () => {
    expect(applyOutcome(createRun(1), 'A').phase).toBe('result');
  });
});
