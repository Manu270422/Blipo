// Yo controlo el ciclo de una partida en cualquier modo: campaña, reto diario o supervivencia.
import { GAME } from '../config.js';
import { t } from '../core/I18n.js';
import { bus } from '../core/EventBus.js';
import { formatTime } from '../core/Format.js';
import { WORLDS, getCampaignLevel, getDailyLevel, getSurvivalLevel } from '../levels/worlds.js';
import { dateKey, dailyNumber } from '../game/Daily.js';
import { getSkin } from '../entities/Skins.js';
import { resultStats } from '../ui/views/ResultView.js';
import { shareText } from './Share.js';

export class Session {
  // Yo recibo el contexto de la app con todas las dependencias.
  constructor(app) {
    this.app = app;
    this.mode = null;
    this.ctx = {};
  }

  // Yo expongo atajos a los sistemas que más uso.
  get game() { return this.app.game; }
  get progress() { return this.app.progress; }
  get storage() { return this.app.storage; }

  // ============== ARRANQUE DE MODOS ==============

  // Yo arranco un nivel de campaña; la primera vez muestro el tutorial antes.
  startCampaign(w, l) {
    // Yo protejo contra niveles o mundos bloqueados.
    if (!this.progress.isWorldUnlocked(w) || !this.progress.isLevelUnlocked(w, l)) { w = 0; l = 0; }
    const level = getCampaignLevel(w, l);
    this.mode = 'campaign';
    this.ctx = { w, l, level };
    // Yo recuerdo el último nivel abierto para el botón "Jugar".
    this.storage.data.last = { world: w, level: l };
    const label = `${w + 1}-${l + 1}`;
    this.withTutorial(() => this.begin(level, { label, mode: 'gems', slots: 3 }));
  }

  // Yo arranco el reto diario del día (mismo nivel para todo el mundo).
  startDaily() {
    const key = dateKey();
    const level = getDailyLevel(key);
    this.mode = 'daily';
    this.ctx = { key, level, n: dailyNumber() };
    this.withTutorial(() => this.begin(level, { label: t('daily_label', { n: this.ctx.n }), mode: 'gems', slots: 3 }));
  }

  // Yo arranco una carrera nueva de supervivencia con semilla aleatoria.
  startSurvival() {
    this.mode = 'survival';
    this.ctx = { seed: Math.floor(Math.random() * 1e9), room: 0, totalTime: 0, totalDeaths: 0 };
    this.withTutorial(() => this.loadRoom(GAME.SURVIVAL_LIVES));
  }

  // Yo cargo la sala actual de supervivencia conservando las vidas.
  loadRoom(lives) {
    const level = getSurvivalLevel(this.ctx.seed, this.ctx.room);
    this.ctx.level = level;
    this.begin(level, { label: t('survival_label', { n: this.ctx.room + 1 }), mode: 'lives', slots: GAME.SURVIVAL_LIVES }, lives);
  }

  // Yo muestro el tutorial solo si el jugador nunca lo vio.
  withTutorial(run) {
    const d = this.storage.data;
    if (d.onboarded) { run(); return; }
    this.app.tutorial.open(this.app.touch.visible, () => {
      d.onboarded = true;
      this.storage.save();
      run();
    });
  }

  // Yo cargo el nivel en el motor y preparo HUD, música y controles.
  begin(level, hud, lives = null) {
    const { app } = this;
    const s = this.storage.data.settings;
    app.screens.show('game', { remember: false });
    app.input.context = 'game';
    app.touch.release();
    app.hud.setup(hud);
    app.hud.showTimer(s.showTimer);
    this.game.load(level, { skin: getSkin(this.storage.data.skins.equipped), highContrast: s.highContrast, lives });
    app.audio.playMusic(level.music || 'w0');
    // Yo explico la mecánica nueva del nivel con un aviso corto.
    if (level.hint) bus.emit('toast', { key: level.hint, icon: 'i-spark' });
    // Yo espero un cuadro para medir el HUD ya visible y ajustar la cámara.
    requestAnimationFrame(() => app.layout());
    app.updateRotateHint();
  }

  // ============== PAUSA ==============

  // Yo pauso y abro el panel con el contexto de la partida.
  pause() {
    const { app } = this;
    if (app.screens.current !== 'game' || this.game.state !== 'playing') return;
    this.game.setPaused(true);
    app.touch.release();
    app.input.context = 'menu';
    app.root.querySelector('[data-bind="pause-sub"]').textContent = this.pauseText();
    app.screens.open('pause');
    app.audio.sfx('click');
  }

  // Yo quito la pausa y devuelvo el control.
  resume() {
    const { app } = this;
    app.screens.close('pause');
    app.input.context = 'game';
    this.game.setPaused(false);
    app.audio.sfx('click');
  }

  // Yo describo dónde está el jugador para el panel de pausa.
  pauseText() {
    const c = this.ctx;
    if (this.mode === 'campaign') {
      const name = c.level.name ? ` · ${t(c.level.name)}` : '';
      return t('pause_level', { world: t(WORLDS[c.w].key), n: c.l + 1 }) + name;
    }
    if (this.mode === 'daily') return t('pause_daily', { n: c.n });
    return t('pause_survival', { n: c.room + 1, lives: this.game.lives });
  }

  // Yo reinicio el nivel actual (desde pausa o con la tecla R).
  restart() {
    const { app } = this;
    if (app.screens.current !== 'game' || !this.game.level) return;
    if (!['playing', 'paused', 'dead'].includes(this.game.state)) return;
    app.screens.close('pause');
    app.input.context = 'game';
    this.game.restart();
    app.audio.sfx('click');
  }

  // Yo salgo al menú; en supervivencia guardo las salas logradas.
  quit() {
    if (this.mode === 'survival' && this.ctx.room > 0) this.progress.saveSurvival(this.ctx.room);
    this.app.goMenu();
  }

  // ============== RESULTADOS ==============

  // Yo proceso un nivel completado según el modo.
  complete(summary) {
    // Yo ignoro avisos duplicados si ya estoy mostrando un resultado.
    if (this.app.screens.topOverlay() === 'result') return;
    if (this.mode === 'campaign') this.completeCampaign(summary);
    else if (this.mode === 'daily') this.completeDaily(summary);
    else if (this.mode === 'survival') this.completeRoom(summary);
    this.app.checkAchievements();
  }

  // Yo guardo el nivel de campaña, calculo premios y ofrezco el siguiente.
  completeCampaign(summary) {
    const { app } = this;
    const { w, l, level } = this.ctx;
    const worldsBefore = WORLDS.filter((x) => this.progress.isWorldUnlocked(x.id)).length;
    const res = this.progress.saveCampaign(w, l, level, summary);
    const worldsAfter = WORLDS.filter((x) => this.progress.isWorldUnlocked(x.id));
    // Yo celebro si se abrió un mundo nuevo.
    if (worldsAfter.length > worldsBefore) {
      const nw = worldsAfter[worldsAfter.length - 1];
      setTimeout(() => app.toast.show(t('world_unlocked', { name: t(nw.key) }), { icon: 'i-star', variant: 'achievement' }), 900);
    }
    const rewards = [];
    if (res.sparks > 0) rewards.push({ text: t('reward_sparks', { n: res.sparks }) });
    if (res.isRecord) rewards.push({ icon: 'i-clock', text: t('reward_record'), record: true });
    const next = this.progress.next(w, l);
    const canNext = next && this.progress.isWorldUnlocked(next.w);
    if (!next) setTimeout(() => app.toast.show(t('game_complete'), { icon: 'i-trophy', variant: 'achievement' }), 900);
    const actions = [
      { id: 'home', icon: 'i-home', label: t('menu'), ghost: true, run: () => app.goMenu() },
      { id: 'levels', icon: 'i-star', label: t('levels_btn'), run: () => app.openWorlds(w) },
      { id: 'retry', icon: 'i-restart', label: t('retry'), run: () => { app.result.hide(); this.startCampaign(w, l); } },
    ];
    if (canNext) actions.push({ id: 'next', icon: 'i-next', label: t('next'), text: true, primary: true, run: () => { app.result.hide(); this.startCampaign(next.w, next.l); } });
    else actions[1].primary = true;
    app.input.context = 'menu';
    app.result.show({
      title: t('level_clear'),
      stars: res.stars,
      stats: resultStats({ time: summary.time, deaths: summary.deaths, par: level.par, gems: summary.gems }),
      rewards,
      actions,
    });
  }

  // Yo guardo el reto diario, sumo racha y ofrezco compartir.
  completeDaily(summary) {
    const { app } = this;
    const { level, n } = this.ctx;
    const res = this.progress.saveDaily(summary, level.par);
    const rewards = [];
    if (res.sparks > 0) rewards.push({ text: t('reward_sparks', { n: res.sparks }) });
    rewards.push({ icon: 'i-flame', text: t('reward_streak', { n: res.streak }), record: res.streakUp });
    const shareMsg = t('share_daily', {
      n,
      stars: '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars),
      time: formatTime(summary.time),
      deaths: summary.deaths,
      streak: res.streak,
    });
    app.input.context = 'menu';
    app.result.show({
      title: t('daily_clear'),
      stars: res.stars,
      stats: resultStats({ time: summary.time, deaths: summary.deaths, par: level.par, gems: summary.gems }),
      rewards,
      actions: [
        { id: 'home', icon: 'i-home', label: t('menu'), ghost: true, run: () => app.goMenu() },
        { id: 'retry', icon: 'i-restart', label: t('retry'), run: () => { app.result.hide(); this.startDaily(); } },
        { id: 'share', icon: 'i-share', label: t('share'), text: true, primary: true, run: () => shareText(shareMsg, app.toast) },
      ],
    });
  }

  // Yo paso a la siguiente sala de supervivencia sin cortar el ritmo.
  completeRoom(summary) {
    const c = this.ctx;
    c.room += 1;
    c.totalTime += summary.time;
    c.totalDeaths += summary.deaths;
    this.app.toast.show(t('room_clear', { n: c.room }), { icon: 'i-check' });
    this.loadRoom(summary.lives);
  }

  // Yo cierro la carrera de supervivencia cuando se acaban las vidas.
  over(summary) {
    if (this.mode !== 'survival') return;
    const { app } = this;
    const c = this.ctx;
    c.totalTime += summary.time;
    const res = this.progress.saveSurvival(c.room);
    app.checkAchievements();
    const rewards = [];
    if (res.sparks > 0) rewards.push({ text: t('reward_sparks', { n: res.sparks }) });
    if (res.isRecord) rewards.push({ icon: 'i-trophy', text: t('reward_record'), record: true });
    const shareMsg = t('share_survival', { n: c.room });
    app.input.context = 'menu';
    app.result.show({
      title: t('survival_over'),
      stars: null,
      stats: [
        { label: t('rooms'), value: String(c.room), good: res.isRecord },
        { label: t('best'), value: String(res.best) },
        { label: t('time'), value: formatTime(c.totalTime) },
      ],
      rewards,
      actions: [
        { id: 'home', icon: 'i-home', label: t('menu'), ghost: true, run: () => app.goMenu() },
        { id: 'share', icon: 'i-share', label: t('share'), run: () => shareText(shareMsg, app.toast) },
        { id: 'again', icon: 'i-restart', label: t('new_run'), text: true, primary: true, run: () => { app.result.hide(); this.startSurvival(); } },
      ],
    });
  }
}
