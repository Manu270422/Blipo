// Yo reparto tres misiones nuevas cada día: pequeñas metas que dan una razón para volver.
// Yo elijo con semilla por fecha (las mismas para todos ese día) y solo misiones que el jugador ya puede cumplir.
import { ECONOMY } from '../config.js';
import { Rng, hashString } from '../core/Random.js';
import { dateKey } from './Daily.js';

// Yo describo cada misión: qué estadística cuenta, metas posibles, premio y cuándo está disponible.
export const MISSION_POOL = [
  { id: 'jumps', stat: 'jumps', goals: [80, 150, 250], reward: 20 },
  { id: 'double', stat: 'doubleJumps', goals: [30, 60], reward: 20 },
  { id: 'walls', stat: 'wallJumps', goals: [15, 30], reward: 25 },
  { id: 'gems', stat: 'gemPickups', goals: [6, 12], reward: 25 },
  { id: 'levels', stat: 'levelClears', goals: [3, 5], reward: 30 },
  { id: 'flawless', stat: 'flawlessClears', goals: [1, 2], reward: 35 },
  { id: 'medals', stat: 'silverRuns', goals: [1, 3], reward: 35 },
  { id: 'records', stat: 'records', goals: [1, 3], reward: 30 },
  { id: 'daily', stat: 'dailyClears', goals: [1], reward: 25 },
  { id: 'rooms', stat: 'survivalRooms', goals: [5, 10], reward: 30 },
  { id: 'bounces', stat: 'bounces', goals: [10, 20], reward: 20, when: (p) => p.isWorldUnlocked(1) },
  { id: 'stomps', stat: 'stomps', goals: [3, 6], reward: 35, when: (p) => p.isLevelUnlocked(0, 6) },
  { id: 'boss', stat: 'bossKills', goals: [1], reward: 40, when: (p) => p.isLevelUnlocked(0, 6) },
  { id: 'portals', stat: 'portals', goals: [5, 10], reward: 20, when: (p) => !!p.record(0, 2)?.cleared },
  { id: 'flips', stat: 'flips', goals: [10, 20], reward: 25, when: (p) => p.isWorldUnlocked(4) },
];

// Yo elijo la frase de una misión (en singular cuando la meta es 1).
export const missionText = (t, m) => t(m.goal === 1 ? `mission_${m.id}_1` : `mission_${m.id}`, { n: m.goal });

export class Missions {
  // Yo trabajo sobre el guardado y el progreso.
  constructor(storage, progress) { this.store = storage; this.progress = progress; }

  // Yo aseguro que existan las misiones de hoy (las genero al cambiar el día).
  today() {
    const day = dateKey();
    const d = this.store.data;
    if (!d.missions || d.missions.day !== day) {
      const rng = new Rng(hashString(`blipo-missions-${day}`));
      const pool = MISSION_POOL.filter((m) => !m.when || m.when(this.progress));
      const list = [];
      while (list.length < 3 && pool.length) {
        const m = pool.splice(Math.floor(rng.next() * pool.length), 1)[0];
        list.push({ id: m.id, stat: m.stat, goal: rng.pick(m.goals), reward: m.reward, progress: 0, done: false });
      }
      d.missions = { day, list, bonus: false };
      this.store.save();
    }
    return d.missions;
  }

  // Yo sumo progreso a las misiones que cuentan esta estadística y pago las que se cumplen.
  track(stat, n = 1) {
    const today = this.today();
    const done = [];
    for (const m of today.list) {
      if (m.done || m.stat !== stat) continue;
      m.progress = Math.min(m.goal, m.progress + n);
      if (m.progress >= m.goal) {
        m.done = true;
        this.store.data.wallet.sparks += m.reward;
        this.store.data.stats.missions = (this.store.data.stats.missions || 0) + 1;
        done.push(m);
      }
    }
    // Yo doy el bono del día al completar las tres.
    let bonus = 0;
    if (done.length && !today.bonus && today.list.every((m) => m.done)) {
      today.bonus = true;
      bonus = ECONOMY.MISSIONS_BONUS;
      this.store.data.wallet.sparks += bonus;
    }
    if (done.length) this.store.save();
    return { done, bonus };
  }
}
