// Yo genero todo el audio con Web Audio: cero archivos, cero peso extra para la Play Store.

// Yo convierto nota MIDI a frecuencia.
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Yo defino los temas musicales por mundo (tono base, tempo y progresión).
const THEMES = {
  menu: { root: 57, bpm: 96, prog: [0, -4, 3, -2], wave: 'triangle' },
  w0: { root: 57, bpm: 112, prog: [0, -4, 3, -2], wave: 'square' },
  w1: { root: 55, bpm: 118, prog: [0, 3, -2, -4], wave: 'square' },
  w2: { root: 52, bpm: 124, prog: [0, -2, -4, -5], wave: 'sawtooth' },
  w3: { root: 60, bpm: 108, prog: [0, 5, -4, -2], wave: 'triangle' },
  w4: { root: 50, bpm: 130, prog: [0, 1, -4, -2], wave: 'sawtooth' },
  boss: { root: 45, bpm: 146, prog: [0, 1, -2, -5], wave: 'sawtooth', fast: true },
};

export class AudioManager {
  // Yo preparo el estado sin crear el contexto (los navegadores exigen un gesto del usuario).
  constructor() {
    this.ctx = null;
    this.sfxVol = 0.8;
    this.musicVol = 0.55;
    this.theme = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  // Yo creo el contexto de audio tras la primera interacción.
  unlock() {
    // Yo reanudo si ya existe.
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    // Yo obtengo la clase compatible.
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // Yo creo el contexto y la cadena de mezcla.
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    // Yo separo efectos y música para controlar sus volúmenes.
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    // Yo paso la música por un filtro: la apago al pausar y la "hundo" un instante al morir.
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 18000;
    this.musicGain.connect(this.musicFilter).connect(this.master);
    // Yo aplico volúmenes guardados.
    this.setVolumes(this.sfxVol, this.musicVol);
    // Yo preparo un buffer de ruido reutilizable.
    this.noise = this.makeNoise();
    // Yo arranco la música pendiente si ya había un tema pedido.
    if (this.theme) this.playMusic(this.theme, true);
  }

  // Yo creo un segundo de ruido blanco.
  makeNoise() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Yo ajusto los volúmenes (0 a 1).
  setVolumes(sfx, music) {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (!this.ctx) return;
    // Yo suavizo el cambio para evitar clics.
    this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.02);
    this.musicGain.gain.setTargetAtTime(music * 0.32, this.ctx.currentTime, 0.05);
  }

  // Yo pauso o reanudo todo el audio (por ejemplo al minimizar la app).
  suspend(on) {
    if (!this.ctx) return;
    if (on) this.ctx.suspend(); else this.ctx.resume();
  }

  // Yo hundo la música un instante (al morir) y la devuelvo sola.
  duck() {
    if (!this.ctx || this.muffled) return;
    const f = this.musicFilter.frequency, t = this.ctx.currentTime;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(380, t + 0.05);
    f.exponentialRampToValueAtTime(18000, t + 0.75);
  }

  // Yo apago la música (pausa) o la devuelvo a su brillo normal.
  muffle(on) {
    if (!this.ctx) return;
    this.muffled = on;
    const f = this.musicFilter.frequency, t = this.ctx.currentTime;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(on ? 650 : 18000, t + 0.25);
  }

  // Yo creo un tono con envolvente simple.
  tone({ type = 'sine', f0, f1 = f0, dur = 0.12, vol = 0.2, delay = 0, dest = this.sfxGain }) {
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    // Yo barro la frecuencia de inicio a fin.
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    // Yo aplico ataque rápido y caída exponencial.
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Yo creo una ráfaga de ruido filtrado.
  burst({ dur = 0.1, vol = 0.2, freq = 1200, type = 'lowpass', delay = 0, dest = this.sfxGain }) {
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // Yo reproduzco un efecto por nombre.
  // "opts.step" sube el tono por pasos (por ejemplo, gemas seguidas).
  sfx(name, opts = {}) {
    // Yo salgo si no hay audio o está silenciado.
    if (!this.ctx || this.sfxVol <= 0) return;
    // Yo varío un poco el tono para que los sonidos repetidos no cansen.
    const vary = 1 + (Math.random() - 0.5) * 0.08;
    const up = Math.pow(2, ((opts.step || 0) * 3) / 12);
    switch (name) {
      case 'jump': this.tone({ type: 'square', f0: 280 * vary, f1: 560 * vary, dur: 0.1, vol: 0.09 }); break;
      case 'double': this.tone({ type: 'triangle', f0: 520, f1: 1040, dur: 0.13, vol: 0.14 }); this.burst({ dur: 0.08, vol: 0.05, freq: 3000, type: 'highpass' }); break;
      case 'walljump': this.tone({ type: 'square', f0: 360 * vary, f1: 620 * vary, dur: 0.09, vol: 0.08 }); break;
      case 'land': this.burst({ dur: 0.06, vol: 0.12, freq: 500 * vary }); break;
      case 'death':
        this.tone({ type: 'sawtooth', f0: 420, f1: 55, dur: 0.38, vol: 0.14 });
        this.burst({ dur: 0.3, vol: 0.2, freq: 900 });
        break;
      case 'gem':
        this.tone({ type: 'sine', f0: 1318 * up, dur: 0.08, vol: 0.14 });
        this.tone({ type: 'sine', f0: 1975 * up, dur: 0.16, vol: 0.12, delay: 0.06 });
        break;
      case 'allgems':
        [1318, 1661, 1975, 2637].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.12, delay: i * 0.06 }));
        this.burst({ dur: 0.25, vol: 0.06, freq: 6000, type: 'highpass', delay: 0.18 });
        break;
      case 'portal': this.tone({ type: 'sine', f0: 180, f1: 1400, dur: 0.32, vol: 0.14 }); break;
      case 'bounce': this.tone({ type: 'sine', f0: 160, f1: 780, dur: 0.18, vol: 0.2 }); break;
      case 'mushroom': this.tone({ type: 'sine', f0: 220, f1: 620, dur: 0.16, vol: 0.18 }); break;
      case 'chime':
        [1318, 1760, 2637].forEach((f, i) => this.tone({ type: 'sine', f0: f, dur: 0.3, vol: 0.08, delay: i * 0.05 }));
        break;
      case 'stomp':
        this.tone({ type: 'square', f0: 220, f1: 90, dur: 0.18, vol: 0.16 });
        this.burst({ dur: 0.15, vol: 0.18, freq: 600 });
        break;
      case 'bossdown':
        this.tone({ type: 'sawtooth', f0: 300, f1: 40, dur: 0.8, vol: 0.16 });
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.13, delay: 0.5 + i * 0.09 }));
        break;
      case 'flip': this.tone({ type: 'triangle', f0: 900, f1: 300, dur: 0.22, vol: 0.12 }); this.tone({ type: 'sine', f0: 300, f1: 900, dur: 0.22, vol: 0.08, delay: 0.05 }); break;
      case 'switch': this.tone({ type: 'square', f0: 520, dur: 0.05, vol: 0.08 }); this.tone({ type: 'square', f0: 780, dur: 0.08, vol: 0.08, delay: 0.06 }); break;
      case 'crack': this.tone({ type: 'square', f0: 1800, f1: 900, dur: 0.06, vol: 0.05 }); break;
      case 'shatter':
        this.burst({ dur: 0.18, vol: 0.12, freq: 4200, type: 'highpass' });
        this.tone({ type: 'triangle', f0: 2400, f1: 1600, dur: 0.12, vol: 0.06 });
        break;
      case 'flame': this.burst({ dur: 0.35, vol: 0.07, freq: 420, type: 'lowpass' }); break;
      case 'crumble': this.burst({ dur: 0.22, vol: 0.14, freq: 700, type: 'bandpass' }); break;
      case 'checkpoint':
        this.tone({ type: 'triangle', f0: 523, dur: 0.1, vol: 0.14 });
        this.tone({ type: 'triangle', f0: 784, dur: 0.18, vol: 0.14, delay: 0.09 });
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.22, vol: 0.14, delay: i * 0.08 }));
        break;
      case 'star': this.tone({ type: 'sine', f0: 1046, f1: 1568, dur: 0.2, vol: 0.13 }); break;
      case 'buy':
        [784, 988, 1318].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.1, vol: 0.07, delay: i * 0.06 }));
        break;
      case 'error': this.tone({ type: 'square', f0: 200, f1: 140, dur: 0.18, vol: 0.08 }); break;
      case 'click': this.tone({ type: 'sine', f0: 700, f1: 520, dur: 0.05, vol: 0.1 }); break;
      case 'achievement':
        [659, 880, 1174, 1568].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.25, vol: 0.11, delay: i * 0.07 }));
        break;
      default: break;
    }
  }

  // Yo arranco (o cambio) el tema musical.
  playMusic(themeId, force = false) {
    // Yo evito reiniciar el mismo tema.
    if (this.theme === themeId && this.timer && !force) return;
    this.theme = themeId;
    // Yo espero al desbloqueo si todavía no hay contexto.
    if (!this.ctx) return;
    // Yo detengo el programador anterior.
    clearInterval(this.timer);
    // Yo reinicio el paso y el tiempo de programación.
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    // Yo programo notas con antelación (patrón "lookahead" de Web Audio).
    this.timer = setInterval(() => this.schedule(), 25);
  }

  // Yo detengo la música.
  stopMusic() {
    clearInterval(this.timer);
    this.timer = null;
    this.theme = null;
  }

  // Yo programo las notas que caen en los próximos 120 ms.
  schedule() {
    const th = THEMES[this.theme] || THEMES.menu;
    // Yo calculo la duración de una semicorchea.
    const sixteenth = 60 / th.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(th, this.step, this.nextTime - this.ctx.currentTime, sixteenth);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  }

  // Yo toco un paso del secuenciador: bajo, arpegio, colchón, melodía y batería.
  playStep(th, step, delay, len) {
    // Yo salgo si la música está en cero.
    if (this.musicVol <= 0) return;
    // Yo elijo el acorde del compás actual.
    const bar = Math.floor(step / 16);
    const root = th.root + th.prog[bar];
    const inBar = step % 16;
    const dest = this.musicGain;
    // Yo pongo un colchón suave con las notas del acorde al empezar cada compás.
    if (inBar === 0) [12, 15, 19].forEach((n) => this.tone({ type: 'triangle', f0: mtof(root + n), dur: len * 15, vol: 0.05, delay, dest }));
    // Yo toco el bajo en corcheas.
    if (inBar % 2 === 0) this.tone({ type: 'triangle', f0: mtof(root - 12), dur: len * 1.8, vol: 0.5, delay, dest });
    // Yo toco un arpegio menor sobre el acorde.
    const arp = [0, 3, 7, 12, 7, 3, 0, 7];
    if (inBar % 2 === 1 || bar % 2 === 1) {
      const n = root + 12 + arp[(step >> 0) % arp.length];
      this.tone({ type: th.wave, f0: mtof(n), dur: len * 0.9, vol: 0.12, delay, dest });
    }
    // Yo agrego una melodía propia de cada tema en los compases pares (pentatónica menor con semilla).
    if (bar % 2 === 0) {
      const motif = this.motif(th);
      const m = motif[inBar];
      if (m !== null) this.tone({ type: 'sine', f0: mtof(th.root + 24 + m), dur: len * 1.6, vol: 0.09, delay, dest });
    }
    // Yo agrego un golpe tipo bombo en los tiempos fuertes.
    if (inBar % 8 === 0) this.tone({ type: 'sine', f0: 140, f1: 45, dur: 0.18, vol: 0.7, delay, dest });
    // Yo agrego una caja en los tiempos 2 y 4.
    if (inBar === 4 || inBar === 12) this.burst({ dur: 0.09, vol: 0.18, freq: 1900, type: 'bandpass', delay, dest });
    // Yo agrego un hi-hat suave a contratiempo (más rápido en los jefes).
    if (inBar % 4 === 2 || (th.fast && inBar % 2 === 1)) this.burst({ dur: 0.04, vol: 0.12, freq: 7000, type: 'highpass', delay, dest });
  }

  // Yo genero (una sola vez por tema) una frase de 16 pasos con notas de la pentatónica menor.
  motif(th) {
    if (th._motif) return th._motif;
    const scale = [0, 3, 5, 7, 10, 12];
    let seed = th.root * 131 + th.bpm * 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    th._motif = Array.from({ length: 16 }, (_, i) => (i % 2 === 0 && rnd() < 0.7 ? scale[Math.floor(rnd() * scale.length)] : null));
    return th._motif;
  }
}
