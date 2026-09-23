// Yo soy el orquestador de BLIPO: creo los sistemas, conecto la interfaz y corro el bucle.
import { bus } from '../core/EventBus.js';
import { Storage } from '../core/Storage.js';
import { i18n, t } from '../core/I18n.js';
import { Loop } from '../core/Loop.js';
import { Input } from '../systems/Input.js';
import { AudioManager } from '../systems/Audio.js';
import { Haptics } from '../systems/Haptics.js';
import { Renderer, makeTheme } from '../engine/Renderer.js';
import { Game } from '../game/Game.js';
import { Progress } from '../game/Progress.js';
import { checkAchievements, ACHIEVEMENT_REWARD } from '../game/Achievements.js';
import { getSkin } from '../entities/Skins.js';
import { ScreenManager } from '../ui/ScreenManager.js';
import { Toast } from '../ui/Toast.js';
import { Dialog } from '../ui/Dialog.js';
import { Hud } from '../ui/Hud.js';
import { TouchControls } from '../ui/TouchControls.js';
import { Mascot } from '../ui/Mascot.js';
import { MenuView } from '../ui/views/MenuView.js';
import { WorldsView } from '../ui/views/WorldsView.js';
import { ShopView } from '../ui/views/ShopView.js';
import { AchievementsView } from '../ui/views/AchievementsView.js';
import { StatsView } from '../ui/views/StatsView.js';
import { SettingsView } from '../ui/views/SettingsView.js';
import { ResultView } from '../ui/views/ResultView.js';
import { TutorialView } from '../ui/views/TutorialView.js';
import { Session } from './Session.js';
import { InstallPrompt, registerServiceWorker } from './Pwa.js';

export class App {
  // Yo construyo todos los sistemas en orden de dependencia.
  constructor(root) {
    this.root = root;
    // Yo cargo el guardado y el idioma antes de pintar cualquier texto.
    this.storage = new Storage();
    i18n.set(this.storage.data.settings.lang || i18n.detect());
    this.progress = new Progress(this.storage);

    // Yo creo los sistemas de entrada, sonido y vibración.
    this.input = new Input();
    this.audio = new AudioManager();
    this.haptics = new Haptics();

    // Yo creo el motor de dibujo y la partida.
    this.renderer = new Renderer(root.querySelector('#game-canvas'));
    this.game = new Game({ input: this.input, audio: this.audio, haptics: this.haptics, renderer: this.renderer });

    // Yo creo la capa de interfaz.
    this.screens = new ScreenManager(root);
    this.toast = new Toast(root.querySelector('[data-toasts]'));
    this.dialog = new Dialog(this.screens);
    this.hud = new Hud(root);
    this.touch = new TouchControls(root, this.input, this.haptics);
    this.mascot = new Mascot(root);
    this.result = new ResultView({ root, screens: this.screens, audio: this.audio });
    this.tutorial = new TutorialView({ root, screens: this.screens, audio: this.audio });

    // Yo creo las vistas de cada pantalla.
    this.views = {
      menu: new MenuView({ root, storage: this.storage, progress: this.progress }),
      worlds: new WorldsView({ root, progress: this.progress, audio: this.audio, onPlay: (w, l) => this.session.startCampaign(w, l) }),
      shop: new ShopView({ root, storage: this.storage, progress: this.progress, audio: this.audio, toast: this.toast, onChange: () => this.onSkinChange() }),
      achievements: new AchievementsView({ root, storage: this.storage, progress: this.progress }),
      stats: new StatsView({ root, storage: this.storage, progress: this.progress }),
      settings: new SettingsView({ root, storage: this.storage, onApply: (name) => this.applySetting(name) }),
    };

    // Yo creo el controlador de partidas y el instalador PWA.
    this.session = new Session(this);
    this.install = new InstallPrompt(root.querySelector('[data-action="install"]'));
    this.rotateDismissed = false;
    this.fromPause = false;
    this.time = 0;
  }

  // Yo arranco la app: textos, ajustes, eventos y bucle.
  boot() {
    i18n.apply();
    this.applyAllSettings();
    this.onSkinChange();
    this.bindDom();
    this.bindBus();
    this.bindWindow();
    this.resize();
    this.checkAchievements(true);
    this.loop = new Loop({ update: (dt) => this.update(dt), render: (dt) => this.render(dt) });
    this.loop.start();
    registerServiceWorker();
    // Yo quito la clase de carga para revelar la interfaz con transición.
    requestAnimationFrame(() => document.documentElement.classList.add('is-ready'));
    return this;
  }

  // ============== BUCLE ==============

  // Yo actualizo la lógica a paso fijo.
  update(dt) {
    this.input.poll();
    if (this.screens.current !== 'game') return;
    this.game.update(dt);
    // Yo sumo tiempo de juego solo mientras se juega de verdad.
    if (this.game.state === 'playing' && this.game.started) this.storage.data.stats.playTime += dt;
  }

  // Yo dibujo el juego o la mascota del menú.
  render(dt) {
    this.time += dt;
    if (this.screens.current === 'game') {
      if (this.game.map) { this.game.render(dt); this.hud.update(this.game); }
    } else {
      this.mascot.render(this.time);
    }
  }

  // ============== AJUSTES ==============

  // Yo aplico todos los ajustes guardados al iniciar.
  applyAllSettings() {
    ['sfx', 'vibration', 'shake', 'reducedMotion', 'highContrast', 'touch', 'showTimer'].forEach((n) => this.applySetting(n, true));
    this.views.settings.render(i18n.lang);
  }

  // Yo aplico un ajuste concreto al cambiar.
  applySetting(name, silent = false) {
    const s = this.storage.data.settings;
    const html = document.documentElement;
    switch (name) {
      case 'music':
      case 'sfx':
        this.audio.setVolumes(s.sfx, s.music);
        if (!silent && name === 'sfx') this.audio.sfx('click');
        break;
      case 'vibration':
        this.haptics.enabled = s.vibration;
        if (!silent && s.vibration) this.haptics.pulse(20);
        break;
      case 'shake':
        this.game.camera.shakeEnabled = s.shake;
        break;
      case 'reducedMotion': {
        // Yo respeto también la preferencia del sistema operativo.
        const sys = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const on = s.reducedMotion || sys;
        html.classList.toggle('reduced-motion', on);
        this.game.particles.scale = on ? 0.35 : 1;
        break;
      }
      case 'highContrast':
        html.classList.toggle('high-contrast', s.highContrast);
        // Yo reconstruyo el tema del nivel en curso si hay uno cargado.
        if (this.game.map) {
          this.game.theme = makeTheme(this.game.level.hue ?? 205, s.highContrast);
          this.game.opts.highContrast = s.highContrast;
          this.game.layout();
        }
        break;
      case 'lang':
        i18n.set(s.lang);
        i18n.apply();
        this.renderScreen(this.screens.current);
        break;
      case 'touch':
      case 'touchSwap':
      case 'touchSize':
      case 'touchOpacity':
        this.touch.configure(s);
        this.layout();
        break;
      case 'showTimer':
        this.hud.showTimer(s.showTimer);
        break;
      default: break;
    }
  }

  // Yo actualizo la skin en la mascota del menú.
  onSkinChange() {
    this.mascot.setSkin(getSkin(this.storage.data.skins.equipped));
    this.checkAchievements();
  }

  // ============== NAVEGACIÓN ==============

  // Yo pinto la vista de la pantalla que se abre.
  renderScreen(name) {
    if (name === 'settings') this.views.settings.render(i18n.lang);
    else this.views[name]?.render();
  }

  // Yo vuelvo al menú principal desde cualquier punto.
  goMenu() {
    ['pause', 'result', 'confirm', 'tutorial'].forEach((o) => this.screens.close(o));
    this.game.state = 'idle';
    this.game.map = null;
    this.touch.release();
    this.input.context = 'menu';
    this.fromPause = false;
    this.screens.resetStack();
    this.screens.show('menu', { remember: false });
    this.storage.flush();
  }

  // Yo abro la lista de niveles en un mundo concreto.
  openWorlds(w) {
    ['pause', 'result'].forEach((o) => this.screens.close(o));
    this.game.state = 'idle';
    this.game.map = null;
    this.input.context = 'menu';
    this.screens.resetStack();
    this.screens.show('menu', { remember: false });
    this.views.worlds.focusWorld(w);
    this.screens.show('worlds');
  }

  // Yo resuelvo el botón/tecla "atrás" según lo que esté abierto.
  back() {
    const top = this.screens.topOverlay();
    if (top === 'confirm') { this.dialog.finish(false); return; }
    if (top === 'tutorial') { this.tutorial.finish(); return; }
    if (top === 'pause') { this.session.resume(); return; }
    if (top === 'result') return;
    const cur = this.screens.current;
    if (cur === 'game') { this.session.pause(); return; }
    if (cur === 'settings' && this.fromPause) { this.returnToPause(); return; }
    if (cur !== 'menu' && cur !== 'splash') { this.audio.sfx('click'); this.screens.back(); }
  }

  // Yo regreso a la partida pausada tras abrir ajustes desde la pausa.
  returnToPause() {
    this.fromPause = false;
    this.screens.show('game', { remember: false });
    this.input.context = 'menu';
    this.screens.open('pause');
    requestAnimationFrame(() => this.layout());
  }

  // ============== EVENTOS DEL DOM ==============

  // Yo conecto todos los botones con delegación de eventos.
  bindDom() {
    this.root.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) { this.audio.sfx('click'); this.screens.show(nav.dataset.nav); return; }
      if (e.target.closest('[data-back]')) { this.back(); return; }
      const act = e.target.closest('[data-action]');
      if (act) this.action(act.dataset.action);
    });
  }

  // Yo ejecuto cada acción declarada en el HTML.
  async action(name) {
    const d = this.storage.data;
    switch (name) {
      case 'start':
        // Yo desbloqueo el audio con el primer toque (requisito de los navegadores).
        this.audio.unlock();
        this.audio.sfx('click');
        this.screens.show('menu', { remember: false });
        // Yo abro directo el reto diario si llegué desde el atajo del ícono instalado.
        if (new URLSearchParams(location.search).get('mode') === 'daily') this.session.startDaily();
        break;
      case 'continue': {
        this.audio.sfx('click');
        const { world, level } = d.last;
        this.session.startCampaign(world, level);
        break;
      }
      case 'daily': this.audio.sfx('click'); this.session.startDaily(); break;
      case 'survival': this.audio.sfx('click'); this.session.startSurvival(); break;
      case 'pause': this.session.pause(); break;
      case 'resume': this.session.resume(); break;
      case 'restart': this.session.restart(); break;
      case 'quit': this.session.quit(); break;
      case 'settings-from-pause':
        this.audio.sfx('click');
        this.fromPause = true;
        this.screens.close('pause');
        this.screens.show('settings', { remember: false });
        break;
      case 'tutorial':
        this.audio.sfx('click');
        this.tutorial.open(this.touch.visible, () => { d.onboarded = true; this.storage.save(); });
        break;
      case 'reset': {
        this.audio.sfx('click');
        const ok = await this.dialog.confirm('reset_title', 'reset_text');
        if (!ok) return;
        this.storage.reset();
        this.onSkinChange();
        this.toast.show(t('reset_done'), { icon: 'i-check' });
        break;
      }
      case 'install': this.install.prompt(); break;
      case 'dismiss-rotate':
        this.rotateDismissed = true;
        this.updateRotateHint();
        break;
      default: break;
    }
  }

  // ============== EVENTOS DEL JUEGO ==============

  // Yo escucho el bus central de eventos.
  bindBus() {
    bus.on('screen', (name) => {
      this.renderScreen(name);
      if (name !== 'game') {
        this.input.context = 'menu';
        if (this.audio.ctx) this.audio.playMusic('menu');
      }
      this.updateRotateHint();
    });
    bus.on('nav:back', () => this.back());
    bus.on('input:pause', () => {
      if (this.screens.topOverlay() === 'pause') this.session.resume();
      else this.session.pause();
    });
    bus.on('input:restart', () => this.session.restart());
    bus.on('game:complete', (summary) => this.session.complete(summary));
    bus.on('game:over', (summary) => this.session.over(summary));
    bus.on('game:gem', () => { this.audio.sfx('gem'); this.haptics.pulse(15); });
    bus.on('stat', ({ key }) => {
      this.progress.bump(key);
      this.storage.save();
      // Yo reviso logros solo con estadísticas que pueden desbloquear alguno.
      if (key !== 'bounces' && key !== 'portals') this.checkAchievements();
    });
    bus.on('toast', ({ key, icon }) => {
      if (key === 'toast_checkpoint') this.audio.sfx('checkpoint');
      this.toast.show(t(key), { icon: icon || 'i-check' });
    });
  }

  // Yo reviso logros nuevos, pago chispas y los anuncio.
  checkAchievements(silent = false) {
    const list = checkAchievements(this.storage, this.progress);
    if (!list.length) return;
    this.storage.data._newAch = true;
    if (silent) return;
    list.forEach((a, i) => setTimeout(() => {
      this.audio.sfx('achievement');
      this.toast.show(t('ach_unlocked', { name: t(`ach_${a.id}`), n: ACHIEVEMENT_REWARD }), { icon: 'i-trophy', variant: 'achievement' });
    }, 600 + i * 900));
  }

  // ============== VENTANA Y DISPOSITIVO ==============

  // Yo escucho cambios de tamaño, orientación y visibilidad.
  bindWindow() {
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => this.resize()); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
    window.visualViewport?.addEventListener('resize', onResize);

    // Yo pauso y silencio cuando la app pasa a segundo plano.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.session.pause();
        this.audio.suspend(true);
        this.storage.flush();
      } else {
        this.audio.suspend(false);
      }
    });
    window.addEventListener('pagehide', () => this.storage.flush());

    // Yo re-aplico los controles táctiles si se conecta un teclado o mouse.
    window.matchMedia('(pointer: coarse)').addEventListener?.('change', () => this.applySetting('touch', true));

    // Yo evito el menú contextual y el zoom accidental sobre el juego.
    this.root.querySelector('#game-canvas').addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  // Yo ajusto el canvas al tamaño real de la app.
  resize() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    this.renderer.resize(w, h);
    this.layout();
    this.updateRotateHint();
  }

  // Yo reservo espacio para el HUD arriba y los controles abajo en vertical.
  layout() {
    const inGame = this.screens.current === 'game';
    const portrait = this.root.clientHeight > this.root.clientWidth;
    this.game.insets = {
      top: inGame ? this.hud.height() : 0,
      bottom: inGame && portrait ? this.touch.height() : 0,
    };
    this.game.layout();
  }

  // Yo sugiero girar el teléfono solo en vertical, en juego y en pantallas pequeñas.
  updateRotateHint() {
    const el = this.root.querySelector('[data-rotate-hint]');
    if (!el) return;
    const portrait = this.root.clientHeight > this.root.clientWidth;
    const small = this.root.clientWidth < 600;
    const show = this.screens.current === 'game' && portrait && small && !this.rotateDismissed;
    el.hidden = !show;
    // Yo lo escondo solo tras unos segundos para no tapar el juego.
    clearTimeout(this.rotateTimer);
    if (show) this.rotateTimer = setTimeout(() => { this.rotateDismissed = true; el.hidden = true; }, 6000);
  }
}
