// Yo defino los logros y los reviso contra el guardado.
import { WORLDS } from '../levels/worlds.js';

// Yo pago chispas por cada logro.
export const ACHIEVEMENT_REWARD = 25;

// Yo describo cada logro con su condición y progreso.
export const ACHIEVEMENTS = [
  { id: 'first_step', goal: 1, value: (d) => d.stats.levelsCleared },
  { id: 'quarry_done', goal: WORLDS[0].count, value: (d, p) => countCleared(p, 0) },
  { id: 'all_worlds', goal: WORLDS.length, value: (d, p) => WORLDS.filter((w) => p.isWorldUnlocked(w.id)).length },
  { id: 'stars_30', goal: 30, value: (d, p) => p.totalStars() },
  { id: 'stars_100', goal: 100, value: (d, p) => p.totalStars() },
  { id: 'gems_20', goal: 20, value: (d, p) => p.totalGems() },
  { id: 'flawless', goal: 1, value: (d) => d.stats.flawless },
  { id: 'flawless_10', goal: 10, value: (d) => d.stats.flawless },
  { id: 'deaths_100', goal: 100, value: (d) => d.stats.deaths },
  { id: 'deaths_1000', goal: 1000, value: (d) => d.stats.deaths },
  { id: 'jumps_1000', goal: 1000, value: (d) => d.stats.jumps + d.stats.doubleJumps },
  { id: 'walljumps_100', goal: 100, value: (d) => d.stats.wallJumps },
  { id: 'daily_1', goal: 1, value: (d) => (d.daily.lastCompleted ? 1 : 0) },
  { id: 'streak_7', goal: 7, value: (d) => d.daily.bestStreak },
  { id: 'survival_5', goal: 5, value: (d) => d.survival.best },
  { id: 'survival_15', goal: 15, value: (d) => d.survival.best },
  { id: 'collector', goal: 3, value: (d) => d.skins.owned.length },
];

// Yo cuento niveles superados de un mundo.
function countCleared(p, w) {
  let n = 0;
  for (let l = 0; l < WORLDS[w].count; l++) if (p.record(w, l)?.cleared) n++;
  return n;
}

// Yo reviso qué logros nuevos se cumplieron y los otorgo.
export function checkAchievements(storage, progress) {
  const d = storage.data;
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (d.achievements[a.id]) continue;
    if (a.value(d, progress) >= a.goal) {
      d.achievements[a.id] = Date.now();
      d.wallet.sparks += ACHIEVEMENT_REWARD;
      unlocked.push(a);
    }
  }
  if (unlocked.length) storage.save();
  return unlocked;
}
