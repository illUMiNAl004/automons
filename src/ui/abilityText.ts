// ============================================================================
// abilityText.ts — Human-readable ability strings for tooltips (UI-only).
// ============================================================================

import type { Ability, DamageTarget, Effect, FriendTarget, Trigger } from '../engine/types';

const TRIGGER_LABEL: Record<Trigger, string> = {
  startOfBattle: 'Start of battle',
  afterAttack: 'After attack',
  onHurt: 'When hurt',
  onFaint: 'On faint',
  onFriendFaint: 'When a friend faints',
};

const TARGET_LABEL: Record<DamageTarget | FriendTarget, string> = {
  // damage targets
  frontEnemy: 'the front enemy',
  backEnemy: 'the back enemy',
  randomEnemy: 'a random enemy',
  strongestEnemy: 'the strongest enemy',
  weakestEnemy: 'the weakest enemy',
  enemyBehindTarget: 'the enemy behind',
  attacker: 'its attacker',
  allEnemies: 'all enemies',
  // friend targets
  self: 'itself',
  friendAhead: 'the friend ahead',
  friendBehind: 'the friend behind',
  randomFriend: 'a random friend',
  allFriends: 'all friends',
};

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function effectText(effect: Effect): string {
  switch (effect.verb) {
    case 'dealDamage':
      return `Deal ${effect.amount} ${effect.dmgType} damage to ${TARGET_LABEL[effect.target]}`;
    case 'buff':
      return `Give ${sign(effect.atk)}/${sign(effect.hp)} to ${TARGET_LABEL[effect.target]}`;
    case 'heal':
      return `Heal ${TARGET_LABEL[effect.target]} for ${effect.amount}`;
    case 'shield':
      return `Grant ${effect.amount} shield to ${TARGET_LABEL[effect.target]}`;
    case 'summon':
      return `Summon a ${effect.token}`;
    case 'buffPerFriendOfType':
      return `Gain ${sign(effect.atk)}/${sign(effect.hp)} per other ${effect.ofType} friend`;
  }
}

export function triggerLabel(trigger: Trigger): string {
  return TRIGGER_LABEL[trigger];
}

export function abilityText(ability: Ability | null): string {
  if (!ability) return 'No ability';
  return `${TRIGGER_LABEL[ability.trigger]}: ${effectText(ability.effect)}`;
}
