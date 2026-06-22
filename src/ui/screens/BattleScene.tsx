// ============================================================================
// BattleScene.tsx — Plays back the engine's event log on the meadow stage.
//
// The engine has ALREADY decided the whole fight (battle.result.eventLog). This
// component just REPLAYS it: it keeps a local view of both teams and walks the
// log one event at a time, animating lunges, hits, faints, summons, buffs, and
// floating ability text. It never computes combat (DESIGN.md §6).
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BattleEvent, BattleWinner, MonsterInstance, Side } from '../../engine/types';
import { useGame } from '../state/store';
import { Background } from '../components/Background';
import { Hud } from '../components/Hud';
import { WoodButton } from '../components/WoodButton';
import { PetFigure } from '../components/Pet';
import { MOTION } from '../theme';

type FloatText = { key: number; text: string; color: string };

// Per-event pacing (ms). Punchy but readable.
const DELAY: Partial<Record<BattleEvent['kind'], number>> = {
  startOfBattle: 650,
  attack: 320,
  damage: 360,
  ability: 600,
  buff: 380,
  heal: 380,
  shieldGain: 380,
  faint: 460,
  summon: 440,
  end: 300,
};

const clone = (m: MonsterInstance): MonsterInstance => ({ ...m });

export function BattleScene() {
  const { battle, actions } = useGame();

  const [boardA, setBoardA] = useState<MonsterInstance[]>([]);
  const [boardB, setBoardB] = useState<MonsterInstance[]>([]);
  const [lungeId, setLungeId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [floats, setFloats] = useState<Record<string, FloatText>>({});
  const [banner, setBanner] = useState<BattleWinner | null>(null);
  const [intro, setIntro] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [logLine, setLog] = useState<string>('');

  const aRef = useRef<MonsterInstance[]>([]);
  const bRef = useRef<MonsterInstance[]>([]);
  const side = useRef(new Map<string, Side>());
  const floatKey = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!battle) return;
    let cancelled = false;
    const log = battle.result.eventLog;

    aRef.current = battle.playerTeam.map(clone);
    bRef.current = battle.opponent.map(clone);
    side.current = new Map();
    battle.playerTeam.forEach((p) => side.current.set(p.instanceId, 'A'));
    battle.opponent.forEach((p) => side.current.set(p.instanceId, 'B'));
    sync();

    const after = (ms: number, fn: () => void) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    const find = (id: string) =>
      aRef.current.find((m) => m.instanceId === id) ?? bRef.current.find((m) => m.instanceId === id);

    function sync() {
      setBoardA([...aRef.current]);
      setBoardB([...bRef.current]);
    }

    function float(id: string, text: string, color: string) {
      const key = floatKey.current++;
      setFloats((f) => ({ ...f, [id]: { key, text, color } }));
      after(820, () => setFloats((f) => (f[id]?.key === key ? omit(f, id) : f)));
    }

    function apply(ev: BattleEvent): number {
      if (ev.kind !== 'attack') setLungeId(null);
      switch (ev.kind) {
        case 'startOfBattle':
          setIntro(true);
          after(600, () => setIntro(false));
          break;
        case 'attack':
          setLungeId(ev.attacker);
          break;
        case 'damage': {
          const t = find(ev.target);
          if (t) {
            const toHp = ev.amount - ev.shielded;
            t.shield = Math.max(0, t.shield - ev.shielded);
            t.hp -= toHp;
            setFlashId(ev.target);
            after(220, () => setFlashId((x) => (x === ev.target ? null : x)));
            float(ev.target, `-${ev.amount}`, '#ff4d57');
          }
          break;
        }
        case 'ability': {
          const s = find(ev.source);
          if (s) float(ev.source, abilityTag(ev.trigger), '#ffd24a');
          setLog(ev.description);
          break;
        }
        case 'buff': {
          const t = find(ev.target);
          if (t) {
            t.atk += ev.atk;
            t.maxHp += ev.hp;
            t.hp += ev.hp;
            float(ev.target, `+${ev.atk}/+${ev.hp}`, '#67e08a');
          }
          break;
        }
        case 'heal': {
          const t = find(ev.target);
          if (t) {
            t.hp = Math.min(t.maxHp, t.hp + ev.amount);
            float(ev.target, `+${ev.amount}`, '#67e08a');
          }
          break;
        }
        case 'shieldGain': {
          const t = find(ev.target);
          if (t) {
            t.shield += ev.amount;
            float(ev.target, `+${ev.amount}🛡`, '#7cc6f2');
          }
          break;
        }
        case 'faint': {
          removeById(aRef.current, ev.target) || removeById(bRef.current, ev.target);
          break;
        }
        case 'summon': {
          const sd: Side = ev.token.instanceId[0] === 'A' ? 'A' : 'B';
          side.current.set(ev.token.instanceId, sd);
          const board = sd === 'A' ? aRef.current : bRef.current;
          board.splice(Math.min(ev.atIndex, board.length), 0, clone(ev.token));
          break;
        }
        case 'end':
          setBanner(ev.winner);
          after(550, () => setShowContinue(true));
          break;
      }
      sync();
      return DELAY[ev.kind] ?? 380;
    }

    let i = 0;
    const tick = () => {
      if (cancelled || i >= log.length) return;
      const ev = log[i++];
      const delay = apply(ev);
      after(delay, tick);
    };
    after(700, tick);

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [battle]);

  if (!battle) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col px-5 py-4">
        <Hud />

        {/* the two armies face off across the field */}
        <div className="flex flex-1 items-center justify-center gap-6">
          <div className="flex flex-row-reverse items-end gap-1">
            <AnimatePresence>
              {boardA.map((p) => (
                <BattlePet key={p.instanceId} pet={p} facing="right" lunge={lungeId === p.instanceId ? 1 : 0} flash={flashId === p.instanceId} float={floats[p.instanceId]} />
              ))}
            </AnimatePresence>
          </div>

          <div className="mb-10 text-2xl font-black text-white/80" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
            VS
          </div>

          <div className="flex items-end gap-1">
            <AnimatePresence>
              {boardB.map((p) => (
                <BattlePet key={p.instanceId} pet={p} facing="left" lunge={lungeId === p.instanceId ? -1 : 0} flash={flashId === p.instanceId} float={floats[p.instanceId]} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* battle log ticker */}
        <div className="flex h-6 items-center justify-center">
          <AnimatePresence mode="popLayout">
            {logLine && (
              <motion.span
                key={logLine}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-full px-4 py-1 text-sm font-bold text-white"
                style={{ background: 'rgba(0,0,0,0.35)' }}
              >
                {logLine}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* intro flash */}
      <AnimatePresence>
        {intro && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              className="rounded-3xl px-10 py-4 text-5xl font-black text-white"
              style={{ background: 'rgba(0,0,0,0.45)', textShadow: '0 3px 8px rgba(0,0,0,0.5)' }}
            >
              ⚔️ BATTLE!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* result banner */}
      <AnimatePresence>
        {banner && <ResultBanner winner={banner} showContinue={showContinue} onContinue={actions.finishBattle} />}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------------------------

function BattlePet({
  pet,
  facing,
  lunge,
  flash,
  float,
}: {
  pet: MonsterInstance;
  facing: 'left' | 'right';
  lunge: number;
  flash: boolean;
  float?: FloatText;
}) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.4, opacity: 0, y: 10 }}
      animate={{ x: lunge * 34, scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 6 }}
      transition={{ x: { type: 'spring', stiffness: 700, damping: 16 }, default: MOTION.pop }}
      className="relative"
    >
      <motion.div animate={flash ? { scale: [1, 1.14, 1] } : { scale: 1 }} transition={{ duration: 0.22 }} style={{ filter: flash ? 'brightness(1.6) saturate(1.8)' : undefined }}>
        <PetFigure monster={pet} facing={facing} interactive={false} />
      </motion.div>

      <AnimatePresence>
        {float && (
          <motion.div
            key={float.key}
            className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 text-lg font-black"
            style={{ color: float.color, textShadow: '0 2px 3px rgba(0,0,0,0.5)' }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -42, opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: MOTION.ease }}
          >
            {float.text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultBanner({ winner, showContinue, onContinue }: { winner: BattleWinner; showContinue: boolean; onContinue: () => void }) {
  const cfg =
    winner === 'A'
      ? { title: 'VICTORY!', sub: '+1 🏆', color: '#67e08a' }
      : winner === 'B'
        ? { title: 'DEFEAT', sub: '−1 ❤️', color: '#ff6b73' }
        : { title: 'DRAW', sub: 'no change', color: '#ffd24a' };
  return (
    <motion.div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(8,10,20,0.45)' }}>
      <motion.div initial={{ scale: 0.4, y: 20 }} animate={{ scale: 1, y: 0 }} transition={MOTION.pop} className="flex flex-col items-center rounded-3xl px-14 py-7" style={{ background: 'rgba(0,0,0,0.55)' }}>
        <div className="text-6xl font-black" style={{ color: cfg.color, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
          {cfg.title}
        </div>
        <div className="mt-1 text-2xl font-black text-white/90">{cfg.sub}</div>
      </motion.div>
      {showContinue && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <WoodButton label="Continue" icon="▶" onClick={onContinue} />
        </motion.div>
      )}
    </motion.div>
  );
}

// ---- helpers ----
function removeById(arr: MonsterInstance[], id: string): boolean {
  const i = arr.findIndex((m) => m.instanceId === id);
  if (i < 0) return false;
  arr.splice(i, 1);
  return true;
}
function omit(obj: Record<string, FloatText>, key: string): Record<string, FloatText> {
  const n = { ...obj };
  delete n[key];
  return n;
}
function abilityTag(trigger: string): string {
  switch (trigger) {
    case 'startOfBattle': return 'Start!';
    case 'afterAttack': return 'Strike!';
    case 'onHurt': return 'Hurt!';
    case 'onFaint': return 'Faint!';
    case 'onFriendFaint': return 'Avenge!';
    default: return '✨';
  }
}
