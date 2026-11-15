/* Motor de audio: micrófono, grabación en PCM, inversión y efectos.
   Grabamos muestras crudas (sin MediaRecorder) para que funcione igual
   en Chrome, Safari/iOS y en la app de Android/iOS. */
(function () {
  let ctx = null;
  let stream = null;
  let current = null; // reproducción en curso

  function ensureContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  async function initMic() {
    ensureContext();
    if (stream && stream.active) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error("insecure");
      err.code = window.isSecureContext ? "unavailable" : "insecure";
      throw err;
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true }
    });
  }

  /* Graba hasta que se llame a stop() o pasen maxMs. onLevel(0..1) para el medidor. */
  function record({ maxMs = 6000, onLevel } = {}) {
    const c = ensureContext();
    const source = c.createMediaStreamSource(stream);
    const proc = c.createScriptProcessor(2048, 1, 1);
    const mute = c.createGain();
    mute.gain.value = 0;
    const chunks = [];
    let done = false, resolveFn, timer;

    proc.onaudioprocess = e => {
      if (done) return;
      const data = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      if (onLevel) {
        let peak = 0;
        for (let i = 0; i < data.length; i += 8) peak = Math.max(peak, Math.abs(data[i]));
        onLevel(Math.min(1, peak * 1.6));
      }
    };
    source.connect(proc);
    proc.connect(mute);
    mute.connect(c.destination);

    const promise = new Promise(r => (resolveFn = r));
    function stop() {
      if (done) return promise;
      done = true;
      clearTimeout(timer);
      try { source.disconnect(); proc.disconnect(); mute.disconnect(); } catch (_) {}
      resolveFn(finish(chunks, c.sampleRate));
      return promise;
    }
    timer = setTimeout(stop, maxMs);
    return { stop, promise };
  }

  /* Une los trozos, recorta silencios al principio y al final y normaliza. */
  function finish(chunks, rate) {
    let len = chunks.reduce((n, ch) => n + ch.length, 0);
    const all = new Float32Array(len);
    let o = 0;
    for (const ch of chunks) { all.set(ch, o); o += ch.length; }

    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(all[i]));
    if (peak < 0.03 || len < rate * 0.2) return null; // silencio

    const th = peak * 0.08;
    let a = 0, b = len - 1;
    while (a < len && Math.abs(all[a]) < th) a++;
    while (b > a && Math.abs(all[b]) < th) b--;
    const pad = Math.floor(rate * 0.08);
    a = Math.max(0, a - pad);
    b = Math.min(len - 1, b + pad);

    const out = ctx.createBuffer(1, b - a + 1, rate);
    const d = out.getChannelData(0);
    const gain = 0.9 / peak;
    for (let i = a; i <= b; i++) d[i - a] = all[i] * gain;
    // pequeño fundido para evitar chasquidos
    const f = Math.min(400, d.length >> 2);
    for (let i = 0; i < f; i++) { d[i] *= i / f; d[d.length - 1 - i] *= i / f; }
    return out;
  }

  /* Transformación reversible: 'whole' invierte todo; 'chunks' invierte 3 trozos. */
  function transform(buf, mode) {
    const out = ctx.createBuffer(1, buf.length, buf.sampleRate);
    const s = buf.getChannelData(0), d = out.getChannelData(0), L = s.length;
    if (mode === "chunks") {
      const size = Math.ceil(L / 3);
      for (let c = 0; c < 3; c++) {
        const a = c * size, b = Math.min(L, a + size);
        for (let i = a; i < b; i++) d[i] = s[b - 1 - (i - a)];
      }
    } else {
      for (let i = 0; i < L; i++) d[i] = s[L - 1 - i];
    }
    return out;
  }

  /* Efectos. rate se deshace al reproducir el intento (1/rate);
     fx solo se aplica al sonido del reto, para hacerlo más difícil. */
  const EFFECTS = [
    { id: "reverse",  emoji: "🔁", mode: "whole",  rate: 1 },
    { id: "squirrel", emoji: "🐿️", mode: "whole",  rate: 1.45 },
    { id: "giant",    emoji: "🦣", mode: "whole",  rate: 0.72 },
    { id: "robot",    emoji: "🤖", mode: "whole",  rate: 1, fx: "robot" },
    { id: "cave",     emoji: "🦇", mode: "whole",  rate: 1, fx: "cave" },
    { id: "phone",    emoji: "📞", mode: "whole",  rate: 1, fx: "phone" },
    { id: "puzzle",   emoji: "🧩", mode: "chunks", rate: 1 },
    { id: "alien",    emoji: "👽", mode: "whole",  rate: 1.3, fx: "robot" }
  ];

  function stopAll() {
    if (current) {
      try { current.src.onended = null; current.src.stop(); } catch (_) {}
      current.cleanup();
      const r = current.resolve;
      current = null;
      r();
    }
  }

  function play(buf, { rate = 1, fx = null } = {}) {
    const c = ensureContext();
    stopAll();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const out = c.createGain();
    out.gain.value = 1;
    out.connect(c.destination);
    const extra = [];

    if (fx === "robot") {
      const ring = c.createGain();
      ring.gain.value = 0;
      const osc = c.createOscillator();
      osc.frequency.value = 55;
      osc.connect(ring.gain);
      osc.start();
      src.connect(ring); ring.connect(out);
      const dry = c.createGain(); dry.gain.value = 0.25;
      src.connect(dry); dry.connect(out);
      out.gain.value = 1.4;
      extra.push(osc, ring, dry);
    } else if (fx === "cave") {
      const delay = c.createDelay(1);
      delay.delayTime.value = 0.19;
      const fb = c.createGain(); fb.gain.value = 0.5;
      const wet = c.createGain(); wet.gain.value = 0.7;
      src.connect(out);
      src.connect(delay); delay.connect(fb); fb.connect(delay);
      delay.connect(wet); wet.connect(out);
      extra.push(delay, fb, wet);
    } else if (fx === "phone") {
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 600;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600;
      src.connect(hp); hp.connect(lp); lp.connect(out);
      out.gain.value = 1.8;
      extra.push(hp, lp);
    } else {
      src.connect(out);
    }

    return new Promise(resolve => {
      const cleanup = () => {
        extra.forEach(n => { try { n.stop && n.stop(); n.disconnect(); } catch (_) {} });
        try { out.disconnect(); } catch (_) {}
      };
      current = { src, cleanup, resolve };
      const tail = fx === "cave" ? 1200 : 0;
      src.onended = () => {
        setTimeout(() => {
          if (current && current.src === src) { cleanup(); current = null; resolve(); }
        }, tail);
      };
      src.start();
    });
  }

  /* Pitidos de acierto / fallo */
  function jingle(good) {
    const c = ensureContext();
    const notes = good ? [523, 659, 784, 1047] : [392, 330, 262];
    notes.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = good ? "triangle" : "sawtooth";
      o.frequency.value = f;
      const t0 = c.currentTime + i * (good ? 0.11 : 0.22);
      const dur = good ? 0.18 : 0.3;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(good ? 0.25 : 0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    });
  }

  /* Dibuja la forma de onda en un canvas */
  function drawWave(canvas, buf, color) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 60;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const g = canvas.getContext("2d");
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    if (!buf) return;
    const d = buf.getChannelData(0);
    const bars = Math.floor(w / 5);
    const step = Math.max(1, Math.floor(d.length / bars));
    g.fillStyle = color;
    for (let i = 0; i < bars; i++) {
      let m = 0;
      for (let j = i * step; j < (i + 1) * step && j < d.length; j += 4) m = Math.max(m, Math.abs(d[j]));
      const bh = Math.max(3, m * (h - 6));
      const x = i * 5, y = (h - bh) / 2;
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, 3, bh, 1.5); else g.rect(x, y, 3, bh);
      g.fill();
    }
  }

  window.AudioEngine = { ensureContext, initMic, record, transform, play, stopAll, jingle, drawWave, EFFECTS };
})();
