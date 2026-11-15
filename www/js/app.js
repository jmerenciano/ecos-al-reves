/* Ecos al Revés: lógica de pantallas y partida */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const A = window.AudioEngine;
  const $ = s => document.querySelector(s);
  const app = $("#app");

  const AVATARS = ["🦊", "🐼", "🐸", "🦁", "🐙", "🦄", "🐧", "🐯", "🐨", "🦖"];
  const COLORS = ["#FF5D73", "#7B4DFF", "#1CB98C", "#FF9F1C", "#2D9CFF", "#E040A0", "#00A6A6", "#F25C05", "#5B6CFF", "#8AB800"];
  const SKEY = "ecos.settings.v1";

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Ajustes ---------- */
  const defaults = () => ({
    lang: I18N.detect(),
    players: [],
    rounds: 3,
    mode: "solo",
    effects: ["reverse"],
    difficulty: "mixed",
    selectedPacks: null,
    showAllLangs: false
  });
  let S = defaults();
  try { S = { ...S, ...JSON.parse(localStorage.getItem(SKEY) || "{}") }; } catch (_) {}
  I18N.set(S.lang);
  if (!S.players.length) S.players = [t("playerN", { n: 1 }), t("playerN", { n: 2 })];
  const saveS = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (_) {} };

  function packsForLang() {
    return Packs.all().filter(p => S.showAllLangs || p.lang === I18N.lang);
  }
  function selectedPacks() {
    const avail = packsForLang().map(p => p.id);
    if (!S.selectedPacks) return avail.filter(id => Packs.get(id).source === "builtin");
    return S.selectedPacks.filter(id => avail.includes(id));
  }

  /* ---------- Utilidades de UI ---------- */
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("out"), 2200);
    setTimeout(() => el.remove(), 2700);
  }

  function modal(html, onMount) {
    const wrap = document.createElement("div");
    wrap.className = "modal-back";
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
    onMount && onMount(wrap.querySelector(".modal"), close);
    return close;
  }

  function confirmBox(text, onYes) {
    modal(`<p class="modal-text">${esc(text)}</p>
      <div class="row end"><button class="btn ghost" data-no>${t("no")}</button><button class="btn danger" data-yes>${t("yes")}</button></div>`,
      (m, close) => {
        m.querySelector("[data-no]").onclick = close;
        m.querySelector("[data-yes]").onclick = () => { close(); onYes(); };
      });
  }

  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("canvas");
    c.className = "confetti";
    document.body.appendChild(c);
    const dpr = devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    const parts = Array.from({ length: 120 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4, a: Math.random() * 6.3, va: (Math.random() - 0.5) * 0.4,
      c: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));
    const t0 = performance.now();
    (function frame(now) {
      g.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(p => {
        p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.a += p.va;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a);
        g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        g.restore();
      });
      if (now - t0 < 2600) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  let wakeLock = null;
  async function keepAwake() {
    try { wakeLock = await navigator.wakeLock?.request("screen"); } catch (_) {}
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && game) keepAwake();
  });

  /* ---------- Pantalla: Ajustes ---------- */
  function renderSetup() {
    A.stopAll();
    const sel = selectedPacks();
    const packs = packsForLang();
    const n = S.players.length;
    if (S.mode === "challenge" && n < 2) S.mode = "solo";

    app.innerHTML = `
    <header class="hero">
      <div class="logo" aria-hidden="true"><span>ECOS</span><span class="flip">SÈVER LA</span></div>
      <h1>Ecos al Revés</h1>
      <p class="tagline">${t("tagline")}</p>
      <label class="lang-pick">🌍 <select id="lang" aria-label="${t("language")}">
        ${I18N.LANGS.map(l => `<option value="${l}" ${l === I18N.lang ? "selected" : ""}>${esc(I18N.name(l))}</option>`).join("")}
      </select></label>
    </header>

    <section class="card">
      <h2>${t("players")} <span class="count">${n}/10</span></h2>
      <ul class="players">
        ${S.players.map((p, i) => `
          <li style="--pc:${COLORS[i]}">
            <span class="avatar">${AVATARS[i]}</span>
            <input id="pl-${i}" value="${esc(p)}" maxlength="16" aria-label="${t("playerN", { n: i + 1 })}">
            ${n > 1 ? `<button class="icon-btn" data-rm="${i}" aria-label="${t("removePlayer")}">✕</button>` : ""}
          </li>`).join("")}
      </ul>
      ${n < 10 ? `<button class="btn ghost wide" id="add">＋ ${t("addPlayer")}</button>` : ""}
    </section>

    <section class="card">
      <h2>${t("mode")}</h2>
      <div class="choice-grid">
        ${["solo", "challenge"].map(m => `
          <button class="choice ${S.mode === m ? "on" : ""}" data-mode="${m}" ${m === "challenge" && n < 2 ? "disabled" : ""}>
            <b>${m === "solo" ? "🎤 " + t("modeSolo") : "🤝 " + t("modeChallenge")}</b>
            <small>${m === "solo" ? t("modeSoloDesc") : (n < 2 ? t("challengeNeeds2") : t("modeChallengeDesc"))}</small>
          </button>`).join("")}
      </div>

      <h2>${t("rounds")}</h2>
      <div class="seg" role="group">
        ${[1, 3, 5, 10].map(r => `<button class="${S.rounds === r ? "on" : ""}" data-rounds="${r}">${r}</button>`).join("")}
      </div>

      <h2>${t("difficulty")}</h2>
      <div class="seg" role="group">
        ${["easy", "medium", "hard", "mixed"].map(d => `<button class="${S.difficulty === d ? "on" : ""}" data-diff="${d}">${t(d)}</button>`).join("")}
      </div>
    </section>

    <section class="card">
      <h2>${t("effects")}</h2>
      <p class="hint">${t("effectsHint")}</p>
      <div class="row">
        <button class="pill-btn" id="fx-classic">🔁 ${t("presetClassic")}</button>
        <button class="pill-btn" id="fx-extra">✨ ${t("presetExtra")}</button>
      </div>
      <div class="fx-grid">
        ${A.EFFECTS.map(f => `
          <button class="fx ${S.effects.includes(f.id) ? "on" : ""}" data-fx="${f.id}" aria-pressed="${S.effects.includes(f.id)}">
            <span class="fx-emoji">${f.emoji}</span><b>${t("fx_" + f.id)}</b><small>${t("fx_" + f.id + "_d")}</small>
          </button>`).join("")}
      </div>
    </section>

    <section class="card">
      <h2>${t("packs")}</h2>
      <div class="pack-grid">
        ${packs.map(p => `
          <button class="pack ${sel.includes(p.id) ? "on" : ""}" data-pack="${p.id}" aria-pressed="${sel.includes(p.id)}">
            <span class="pack-emoji">${esc(p.emoji)}</span>
            <b>${esc(p.name)}</b>
            <small>${t("nWords", { n: Packs.count(p) })}${S.showAllLangs ? " · " + p.lang.toUpperCase() : ""}</small>
          </button>`).join("")}
      </div>
      <button class="btn ghost wide" id="manage">📚 ${t("managePacks")}</button>
    </section>

    <footer class="foot">
      <a href="privacy.html" target="_blank" rel="noopener">${t("privacy")}</a>
      ${Ads.hasPrivacyOptions ? `<button class="link-btn" id="ad-opts">${t("adsOptions")}</button>` : ""}
    </footer>

    <div class="start-bar"><button class="btn primary big" id="start">${t("start")}</button></div>
    `;

    $("#lang").onchange = e => {
      // los nombres por defecto ("Jugador 1") se traducen al nuevo idioma
      const oldNames = S.players.map((_, i) => t("playerN", { n: i + 1 }));
      I18N.set(e.target.value); S.lang = e.target.value;
      S.players = S.players.map((p, i) => (p === oldNames[i] ? t("playerN", { n: i + 1 }) : p));
      S.selectedPacks = null;
      saveS(); renderSetup();
    };
    S.players.forEach((_, i) => {
      $("#pl-" + i).oninput = e => { S.players[i] = e.target.value; saveS(); };
    });
    app.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { S.players.splice(+b.dataset.rm, 1); saveS(); renderSetup(); });
    const add = $("#add");
    if (add) add.onclick = () => { S.players.push(t("playerN", { n: S.players.length + 1 })); saveS(); renderSetup(); };
    app.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { S.mode = b.dataset.mode; saveS(); renderSetup(); });
    app.querySelectorAll("[data-rounds]").forEach(b => b.onclick = () => { S.rounds = +b.dataset.rounds; saveS(); renderSetup(); });
    app.querySelectorAll("[data-diff]").forEach(b => b.onclick = () => { S.difficulty = b.dataset.diff; saveS(); renderSetup(); });
    app.querySelectorAll("[data-fx]").forEach(b => b.onclick = () => {
      const id = b.dataset.fx;
      S.effects = S.effects.includes(id) ? S.effects.filter(x => x !== id) : S.effects.concat(id);
      if (!S.effects.length) S.effects = ["reverse"];
      saveS(); renderSetup();
    });
    $("#fx-classic").onclick = () => { S.effects = ["reverse"]; saveS(); renderSetup(); };
    $("#fx-extra").onclick = () => { S.effects = A.EFFECTS.map(f => f.id); saveS(); renderSetup(); };
    app.querySelectorAll("[data-pack]").forEach(b => b.onclick = () => {
      let cur = selectedPacks();
      const id = b.dataset.pack;
      cur = cur.includes(id) ? cur.filter(x => x !== id) : cur.concat(id);
      S.selectedPacks = cur; saveS(); renderSetup();
    });
    $("#manage").onclick = renderPacks;
    const ao = $("#ad-opts");
    if (ao) ao.onclick = () => Ads.showPrivacyOptions();
    $("#start").onclick = startGame;
  }

  /* ---------- Pantalla: Temarios ---------- */
  let catalogCache = null;

  function renderPacks() {
    const mine = Packs.all().filter(p => S.showAllLangs || p.lang === I18N.lang);
    app.innerHTML = `
      <header class="topbar"><button class="btn ghost" id="back">← ${t("back")}</button><h1>${t("packsTitle")}</h1></header>
      <label class="check"><input type="checkbox" id="alllangs" ${S.showAllLangs ? "checked" : ""}> ${t("allLanguages")}</label>

      <section class="card">
        <h2>${t("installed")}</h2>
        <ul class="pack-list">
          ${mine.map(p => `
            <li>
              <span class="pack-emoji">${esc(p.emoji)}</span>
              <div class="grow"><b>${esc(p.name)}</b>
                <small>${t("nWords", { n: Packs.count(p) })} · ${p.lang.toUpperCase()} · ${p.source === "builtin" ? t("builtin") : p.source === "custom" ? t("custom") : t("downloaded")}</small></div>
              <div class="row tight">
                ${p.source === "custom" ? `<button class="icon-btn" data-edit="${p.id}" aria-label="${t("edit")}">✏️</button>` : ""}
                <button class="icon-btn" data-exp="${p.id}" aria-label="${t("export")}">📤</button>
                ${p.source !== "builtin" ? `<button class="icon-btn" data-del="${p.id}" aria-label="${t("remove")}">🗑️</button>` : ""}
              </div>
            </li>`).join("")}
        </ul>
        <div class="row wrap">
          <button class="btn" id="create">＋ ${t("create")}</button>
          <label class="btn ghost file-btn">📁 ${t("import")}<input type="file" id="file" accept=".json,application/json,text/plain" hidden></label>
          <button class="btn ghost" id="paste">📋 ${t("paste")}</button>
        </div>
      </section>

      <section class="card">
        <h2>${t("catalog")}</h2>
        <div id="catalog"><p class="hint">${t("loading")}</p></div>
      </section>`;

    $("#back").onclick = renderSetup;
    $("#alllangs").onchange = e => { S.showAllLangs = e.target.checked; saveS(); renderPacks(); };
    $("#create").onclick = () => editor();
    $("#paste").onclick = pasteBox;
    $("#file").onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      const p = Packs.importText(await f.text());
      if (p) { addToSelection(p.id); toast(t("imported", { name: p.name })); renderPacks(); }
      else toast(t("importError"));
    };
    app.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      Packs.remove(b.dataset.del);
      if (S.selectedPacks) S.selectedPacks = S.selectedPacks.filter(x => x !== b.dataset.del);
      saveS(); toast(t("removed")); renderPacks();
    });
    app.querySelectorAll("[data-exp]").forEach(b => b.onclick = () => exportBox(Packs.get(b.dataset.exp)));
    app.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editor(Packs.get(b.dataset.edit)));
    loadCatalog();
  }

  function addToSelection(id) {
    S.selectedPacks = [...new Set(selectedPacks().concat(id))];
    saveS();
  }

  async function loadCatalog() {
    const box = $("#catalog");
    try {
      if (!catalogCache) catalogCache = await Packs.catalog();
    } catch (_) {
      if (box) box.innerHTML = `<p class="hint error">${t("catalogError")}</p>`;
      return;
    }
    if (!box) return;
    const list = catalogCache.filter(e => !e.builtin && (S.showAllLangs || e.lang === I18N.lang));
    if (!list.length) { box.innerHTML = `<p class="hint">—</p>`; return; }
    box.innerHTML = `<ul class="pack-list">${list.map(e => {
      const have = Packs.get(e.id);
      const locked = !have && e.premium && Ads.available;
      const label = !have ? (locked ? t("watchToUnlock") : t("download")) : (have.version < e.version ? t("update") : t("downloaded"));
      return `<li>
        <span class="pack-emoji">${esc(e.emoji)}</span>
        <div class="grow"><b>${esc(e.name)}${e.premium ? ` <span class="premium">${t("premium")}</span>` : ""}</b><small>${esc(e.description)} · ${t("nWords", { n: e.count })} · ${e.lang.toUpperCase()}</small></div>
        <button class="btn small ${have && have.version >= e.version ? "ghost" : ""}" data-dl="${e.id}" ${have && have.version >= e.version ? "disabled" : ""}>${label}</button>
      </li>`;
    }).join("")}</ul>`;
    box.querySelectorAll("[data-dl]").forEach(b => b.onclick = async () => {
      const entry = catalogCache.find(e => e.id === b.dataset.dl);
      b.disabled = true;
      if (entry.premium && !Packs.get(entry.id) && Ads.available) {
        const ok = await Ads.rewarded();
        if (!ok) { b.disabled = false; return; }
      }
      b.textContent = t("loading");
      try {
        const p = await Packs.download(entry);
        addToSelection(p.id);
        toast(t("imported", { name: p.name }));
        renderPacks();
      } catch (_) { toast(t("catalogError")); b.disabled = false; b.textContent = t("download"); }
    });
  }

  function editor(pack) {
    const w = k => (pack?.words?.[k] || []).join("\n");
    modal(`
      <h2>${pack ? t("edit") : t("create")}</h2>
      <div class="row">
        <label class="field small"><span>${t("packEmoji")}</span><input id="ed-emoji" maxlength="4" value="${esc(pack?.emoji || "🎲")}"></label>
        <label class="field grow"><span>${t("packName")}</span><input id="ed-name" maxlength="40" value="${esc(pack?.name || "")}"></label>
      </div>
      <label class="field"><span>${t("wordsEasy")}</span><textarea id="ed-easy" rows="3">${esc(w("easy"))}</textarea></label>
      <label class="field"><span>${t("wordsMedium")}</span><textarea id="ed-medium" rows="3">${esc(w("medium"))}</textarea></label>
      <label class="field"><span>${t("wordsHard")}</span><textarea id="ed-hard" rows="3">${esc(w("hard"))}</textarea></label>
      <div class="row end"><button class="btn ghost" data-cancel>${t("cancel")}</button><button class="btn primary" data-save>${t("save")}</button></div>`,
      (m, close) => {
        m.querySelector("[data-cancel]").onclick = close;
        m.querySelector("[data-save]").onclick = () => {
          const lines = id => m.querySelector(id).value.split(/\n|,/);
          const name = m.querySelector("#ed-name").value.trim();
          if (!name) return toast(t("emptyName"));
          const p = Packs.sanitize({
            id: pack?.id, lang: pack?.lang || I18N.lang, name,
            emoji: m.querySelector("#ed-emoji").value.trim() || "🎲",
            version: (pack?.version || 0) + 1,
            words: { easy: lines("#ed-easy"), medium: lines("#ed-medium"), hard: lines("#ed-hard") }
          });
          if (!p) return toast(t("emptyWords"));
          Packs.save(p, "custom");
          addToSelection(p.id);
          close(); toast(t("saved")); renderPacks();
        };
      });
  }

  function pasteBox() {
    modal(`<h2>${t("paste")}</h2>
      <label class="field"><span>${t("pasteHere")}</span><textarea id="paste-txt" rows="8"></textarea></label>
      <div class="row end"><button class="btn ghost" data-cancel>${t("cancel")}</button><button class="btn primary" data-ok>${t("import")}</button></div>`,
      (m, close) => {
        m.querySelector("[data-cancel]").onclick = close;
        m.querySelector("[data-ok]").onclick = () => {
          const p = Packs.importText(m.querySelector("#paste-txt").value);
          if (!p) return toast(t("importError"));
          addToSelection(p.id); close(); toast(t("imported", { name: p.name })); renderPacks();
        };
      });
  }

  function exportBox(pack) {
    const text = Packs.exportText(pack);
    const filename = `${pack.id}.ecos.json`;
    modal(`<h2>${t("export")}: ${esc(pack.emoji)} ${esc(pack.name)}</h2>
      <p class="hint">${t("exportHint")}</p>
      <textarea class="code" rows="8" readonly id="exp-txt">${esc(text)}</textarea>
      <div class="row wrap end">
        <button class="btn ghost" data-close>${t("back")}</button>
        <button class="btn" data-copy>📋 ${t("copy")}</button>
        <button class="btn primary" data-share>📤 ${t("share")}</button>
      </div>`,
      (m, close) => {
        m.querySelector("[data-close]").onclick = close;
        m.querySelector("[data-copy]").onclick = async () => {
          const ta = m.querySelector("#exp-txt");
          try { await navigator.clipboard.writeText(text); toast(t("copied")); }
          catch (_) { ta.focus(); ta.select(); try { document.execCommand("copy"); toast(t("copied")); } catch (__) {} }
        };
        m.querySelector("[data-share]").onclick = async () => {
          const file = new File([text], filename, { type: "application/json" });
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: pack.name });
              return;
            }
          } catch (e) { if (e.name === "AbortError") return; }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(file);
          a.download = filename;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        };
      });
  }

  /* ---------- Partida ---------- */
  let game = null;
  let turn = null;
  let rec = null; // grabación en curso

  async function startGame() {
    const ids = selectedPacks();
    const words = Packs.deck(ids, S.difficulty);
    if (!words.length) return toast(t("noPacks"));
    try {
      await A.initMic();
    } catch (e) {
      return toast(e.code === "insecure" ? t("micNeedsHttps") : t("micError"));
    }
    keepAwake();
    game = {
      players: S.players.map((name, i) => ({ name: name.trim() || t("playerN", { n: i + 1 }), score: 0, avatar: AVATARS[i], color: COLORS[i] })),
      round: 1, idx: 0, deck: words, deckPos: 0, ids, history: []
    };
    startTurn();
  }

  function nextWord() {
    if (game.deckPos >= game.deck.length) { game.deck = Packs.deck(game.ids, S.difficulty); game.deckPos = 0; }
    return game.deck[game.deckPos++];
  }

  function startTurn() {
    const n = game.players.length;
    const imitator = game.idx;
    const recorder = S.mode === "challenge" ? (imitator - 1 + n) % n : imitator;
    const fxId = S.effects[Math.floor(Math.random() * S.effects.length)];
    turn = {
      imitator, recorder,
      word: nextWord(),
      effect: A.EFFECTS.find(f => f.id === fxId) || A.EFFECTS[0],
      original: null, challenge: null, attempt: null, result: null,
      listens: 0, step: "word", wordShown: S.mode === "solo"
    };
    if (n > 1) renderPass(recorder, () => renderTurn());
    else renderTurn();
  }

  function header() {
    const p = game.players;
    return `<header class="game-top">
      <div class="row between">
        <span class="round-chip">${t("roundOf", { r: game.round, t: S.rounds })}</span>
        <button class="btn ghost small" id="quit">${t("quit")}</button>
      </div>
      ${p.length > 1 ? `<div class="score-strip" aria-label="${t("scoreboard")}">
        ${p.map((pl, i) => `<span class="score-chip ${i === turn.imitator ? "active" : ""}" style="--pc:${pl.color}">${pl.avatar} ${esc(pl.name)} <b>${pl.score}</b></span>`).join("")}
      </div>` : ""}
    </header>`;
  }

  function bindQuit() {
    const q = $("#quit");
    if (q) q.onclick = () => confirmBox(t("quitConfirm"), () => { stopRec(); game = null; renderSetup(); });
  }

  function renderPass(playerIdx, then, note) {
    A.stopAll();
    const p = game.players[playerIdx];
    app.innerHTML = `${header()}
      <section class="pass" style="--pc:${p.color}">
        ${note ? `<p class="pass-note">${esc(note)}</p>` : ""}
        <p class="pass-label">${t("passTo")}</p>
        <div class="pass-avatar">${p.avatar}</div>
        <h1 class="pass-name">${esc(p.name)}</h1>
        <button class="btn primary big" id="ready">${t("ready")}</button>
      </section>`;
    bindQuit();
    $("#ready").onclick = then;
  }

  function stopRec() { if (rec) { rec.stop(); rec = null; } }

  /* Botón grande de grabar. onDone(buffer|null) */
  function mountRecorder(btn, onDone, maxMs = 6000) {
    const label = btn.querySelector(".rec-label");
    btn.onclick = async () => {
      if (rec) { stopRec(); return; }
      A.stopAll();
      A.ensureContext();
      btn.classList.add("live");
      label.textContent = t("stop");
      btn.style.setProperty("--dur", maxMs + "ms");
      const r = A.record({ maxMs, onLevel: l => btn.style.setProperty("--lvl", l.toFixed(2)) });
      rec = r;
      const buf = await r.promise;
      rec = null;
      btn.classList.remove("live");
      label.textContent = t("tapRecord");
      if (!buf) { toast(t("silent")); return; }
      onDone(buf);
    };
  }

  function recButtonHTML(id) {
    return `<button class="rec-btn" id="${id}"><span class="rec-ring"></span><span class="rec-dot">🎙️</span><span class="rec-label">${t("tapRecord")}</span></button>`;
  }

  function fxBadge() {
    const f = turn.effect;
    return `<span class="fx-badge">${f.emoji} ${t("fxLabel")}: <b>${t("fx_" + f.id)}</b></span>`;
  }

  function renderTurn() {
    A.stopAll();
    const P = game.players;
    const imit = P[turn.imitator], recd = P[turn.recorder];
    const challenge = S.mode === "challenge";
    let body = "";

    if (turn.step === "word") {
      body = `
        <p class="who" style="--pc:${recd.color}">${recd.avatar} ${challenge ? esc(t("recorderTurn", { name: recd.name })) : esc(t("turnOf", { name: recd.name }))}</p>
        ${challenge ? `<p class="warn">🙈 ${esc(t("dontLook", { name: imit.name }))}</p>` : ""}
        <div class="word-card">
          <small>${challenge ? t("secretWord") : t("readAloud")}</small>
          <div class="word" id="word">${esc(turn.word)}</div>
          <div class="row center tight">
            <button class="pill-btn" id="other">🔀 ${t("otherWord")}</button>
            <button class="pill-btn" id="type">✏️ ${t("typeWord")}</button>
          </div>
        </div>
        ${recButtonHTML("rec")}`;
    }

    if (turn.step === "listen") {
      body = `
        <p class="who" style="--pc:${imit.color}">${imit.avatar} ${esc(t("turnOf", { name: imit.name }))}</p>
        ${turn.wordShown ? `<div class="word-card mini"><small>${t("readAloud")}</small><div class="word">${esc(turn.word)}</div></div>` : ""}
        <div class="listen-card">
          <h2>${t("listenTitle")}</h2>
          ${fxBadge()}
          <canvas class="wave" id="wave-ch"></canvas>
          <button class="btn play big" id="play-ch">▶ ${t("listen")}</button>
          <p class="hint" id="listens">${turn.listens ? t("listens", { n: turn.listens }) : t("listenUnlimited")}</p>
        </div>
        <p class="hint strong">🎯 ${t("imitateHint")}</p>
        ${recButtonHTML("rec")}
        ${!challenge ? `<button class="link-btn" id="redo">↺ ${t("rerecord")}</button>` : ""}`;
    }

    if (turn.step === "reveal") {
      const showVotes = turn.wordShown;
      const judge = P.length > 1 ? t("voteOthers") : t("voteSelf");
      body = `
        <h2 class="reveal-title">🔄 ${t("revealTitle")}</h2>
        ${!turn.wordShown
          ? `<p class="hint strong">${esc(t("guessHint", { name: imit.name }))}</p>
             <button class="btn big" id="show-word">👀 ${t("showWord")}</button>`
          : `<div class="word-card mini"><small>${t("theWordWas")}</small><div class="word">${esc(turn.word)}</div></div>`}
        <div class="compare">
          <div class="cmp" style="--pc:${imit.color}">
            <canvas class="wave" id="wave-res"></canvas>
            <button class="btn play" id="play-res">▶ ${t("playAttempt")}</button>
          </div>
          <div class="cmp" style="--pc:${recd.color}">
            <canvas class="wave" id="wave-orig"></canvas>
            <button class="btn play ghost" id="play-orig">▶ ${t("playOriginal")}</button>
          </div>
          <button class="link-btn" id="play-ch">${turn.effect.emoji} ${t("playChallenge")}</button>
        </div>
        ${funnyHTML()}
        ${showVotes ? `
          <div class="vote">
            <p><b>${t("vote")}</b><br><small>${judge}</small></p>
            <div class="row center">
              <button class="btn miss big" id="v-miss">✗ ${t("miss").replace(/[¡!]/g, "")}</button>
              <button class="btn hit big" id="v-hit">✓ ${t("hit").replace(/[¡!]/g, "")}</button>
            </div>
          </div>` : ""}`;
    }

    app.innerHTML = header() + `<main class="turn">${body}</main>`;
    bindQuit();

    if (turn.step === "word") {
      $("#other").onclick = () => { turn.word = nextWord(); $("#word").textContent = turn.word; };
      $("#type").onclick = () => modal(`
        <label class="field"><span>${t("typeWordPh")}</span><input id="custom-word" maxlength="60"></label>
        <div class="row end"><button class="btn ghost" data-c>${t("cancel")}</button><button class="btn primary" data-ok>${t("ok")}</button></div>`,
        (m, close) => {
          const inp = m.querySelector("#custom-word");
          inp.focus();
          const ok = () => { const v = inp.value.trim(); if (v) { turn.word = v; $("#word").textContent = v; } close(); };
          m.querySelector("[data-ok]").onclick = ok;
          inp.onkeydown = e => { if (e.key === "Enter") ok(); };
          m.querySelector("[data-c]").onclick = close;
        });
      mountRecorder($("#rec"), buf => {
        turn.original = buf;
        turn.challenge = A.transform(buf, turn.effect.mode);
        turn.step = "listen";
        turn.listens = 0;
        if (S.mode === "challenge") renderPass(turn.imitator, renderTurn);
        else renderTurn();
      });
    }

    if (turn.step === "listen") {
      A.drawWave($("#wave-ch"), turn.challenge, getCss("--grape"));
      $("#play-ch").onclick = async () => {
        turn.listens++;
        $("#listens").textContent = t("listens", { n: turn.listens });
        await A.play(turn.challenge, { rate: turn.effect.rate, fx: turn.effect.fx });
      };
      mountRecorder($("#rec"), buf => {
        turn.attempt = buf;
        turn.result = A.transform(buf, turn.effect.mode);
        turn.step = "reveal";
        // guardamos las últimas imitaciones para los "mejores momentos"
        game.history.push({ p: turn.imitator, word: turn.word, buf: turn.result, rate: 1 / turn.effect.rate });
        if (game.history.length > 12) game.history.shift();
        renderTurn();
        A.play(turn.result, { rate: 1 / turn.effect.rate });
      });
      const redo = $("#redo");
      if (redo) redo.onclick = () => { turn.step = "word"; renderTurn(); };
    }

    if (turn.step === "reveal") {
      A.drawWave($("#wave-res"), turn.result, imit.color);
      A.drawWave($("#wave-orig"), turn.original, recd.color);
      $("#play-res").onclick = () => A.play(turn.result, { rate: 1 / turn.effect.rate });
      $("#play-orig").onclick = () => A.play(turn.original);
      $("#play-ch").onclick = () => A.play(turn.challenge, { rate: turn.effect.rate, fx: turn.effect.fx });
      bindFunny(app, turn.result, 1 / turn.effect.rate);
      const sw = $("#show-word");
      if (sw) sw.onclick = () => { turn.wordShown = true; renderTurn(); };
      const vh = $("#v-hit"), vm = $("#v-miss");
      if (vh) vh.onclick = () => verdict(true);
      if (vm) vm.onclick = () => verdict(false);
    }
  }

  /* Voces graciosas para volver a escuchar una imitación y reírse */
  const FUNNY = [
    { id: "squirrel", emoji: "🐿️", rate: 1.7 },
    { id: "giant", emoji: "🦣", rate: 0.6 },
    { id: "robot", emoji: "🤖", rate: 1, fx: "robot" },
    { id: "alien", emoji: "👽", rate: 1.45, fx: "robot" },
    { id: "cave", emoji: "🦇", rate: 0.9, fx: "cave" }
  ];
  function funnyHTML() {
    return `<div class="funny"><p>${t("funnyVoices")}</p><div class="row center wrap tight">
      ${FUNNY.map(v => `<button class="pill-btn voice" data-voice="${v.id}">${v.emoji} ${t("fx_" + v.id)}</button>`).join("")}
    </div></div>`;
  }
  function bindFunny(root, buf, baseRate) {
    root.querySelectorAll(".funny [data-voice]").forEach(b => b.onclick = () => {
      const v = FUNNY.find(x => x.id === b.dataset.voice);
      A.play(buf, { rate: baseRate * v.rate, fx: v.fx });
    });
  }
  const pick = key => { const l = t(key).split("|"); return l[Math.floor(Math.random() * l.length)]; };

  function getCss(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#7B4DFF"; }

  function verdict(good) {
    A.stopAll();
    const p = game.players[turn.imitator];
    if (good) p.score++;
    A.jingle(good);
    if (good) confetti();
    const last = game.idx === game.players.length - 1 && game.round === S.rounds;
    app.innerHTML = header() + `
      <main class="verdict ${good ? "good" : "bad"}">
        <div class="verdict-emoji">${good ? "🎉" : "🙈"}</div>
        <h1>${good ? t("hit") : t("miss")}</h1>
        <p class="verdict-line">${esc(pick(good ? "hitLines" : "missLines"))}</p>
        <p class="verdict-who" style="--pc:${p.color}">${p.avatar} ${esc(p.name)} · ${t("pts", { n: p.score })}</p>
        ${funnyHTML()}
        <button class="btn primary big" id="next">${last ? t("seeResults") : t("next")}</button>
      </main>`;
    bindQuit();
    bindFunny(app, turn.result, 1 / turn.effect.rate);
    $("#next").onclick = async () => {
      A.stopAll();
      await Ads.afterTurn(last);
      game.idx++;
      if (game.idx >= game.players.length) { game.idx = 0; game.round++; }
      if (game.round > S.rounds) renderFinal(); else startTurn();
    };
  }

  function renderFinal() {
    A.stopAll();
    const ranked = game.players.map((p, i) => ({ ...p, i })).sort((a, b) => b.score - a.score);
    const top = ranked[0].score;
    const winners = ranked.filter(p => p.score === top);
    const title = game.players.length === 1
      ? t("hits", { n: top, t: S.rounds })
      : winners.length > 1 ? t("tie") : t("winner", { name: winners[0].name });
    let place = 0, prev = null;
    app.innerHTML = `
      <main class="final">
        <h2>${t("final")}</h2>
        <div class="trophy">🏆</div>
        <h1>${esc(title)}</h1>
        <ol class="ranking">
          ${ranked.map((p, k) => {
            if (p.score !== prev) { place = k + 1; prev = p.score; }
            return `<li style="--pc:${p.color}" class="${p.score === top ? "first" : ""}">
              <span class="place">${place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : place}</span>
              <span class="avatar">${p.avatar}</span><span class="grow">${esc(p.name)}</span><b>${t("pts", { n: p.score })}</b></li>`;
          }).join("")}
        </ol>
        ${game.history.length ? `
        <section class="card moments">
          <h2>${t("bestMoments")}</h2>
          <ul>
            ${game.history.slice().reverse().map((h, k) => {
              const pl = game.players[h.p];
              return `<li style="--pc:${pl.color}">
                <span class="avatar">${pl.avatar}</span>
                <span class="grow"><b>${esc(pl.name)}</b><small>${esc(h.word)}</small></span>
                <button class="icon-btn" data-m="${k}" data-v="" aria-label="${t("playAttempt")}">▶</button>
                <button class="icon-btn" data-m="${k}" data-v="squirrel" aria-label="${t("fx_squirrel")}">🐿️</button>
                <button class="icon-btn" data-m="${k}" data-v="giant" aria-label="${t("fx_giant")}">🦣</button>
              </li>`;
            }).join("")}
          </ul>
        </section>` : ""}
        <div class="row center wrap">
          <button class="btn ghost big" id="settings">${t("newGame")}</button>
          <button class="btn primary big" id="again">${t("playAgain")}</button>
        </div>
      </main>`;
    if (top > 0) confetti();
    const hist = game.history.slice().reverse();
    app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => {
      const h = hist[+b.dataset.m];
      const v = FUNNY.find(x => x.id === b.dataset.v);
      A.play(h.buf, { rate: h.rate * (v ? v.rate : 1), fx: v && v.fx });
    });
    $("#again").onclick = startGame;
    $("#settings").onclick = () => { game = null; renderSetup(); };
  }

  renderSetup();
  // Los anuncios se preparan en segundo plano; al estar listos se refresca
  // la pantalla de ajustes para mostrar "Opciones de anuncios" si hace falta.
  Ads.init().then(() => { if (!game && $("#start")) renderSetup(); });
})();
