/* Temarios: incluidos, descargados del catálogo y propios.
   Formato de un temario (también el de exportar/importar):
   {
     "format": "ecos-al-reves/pack@1",
     "id": "es-deportes", "lang": "es", "name": "Deportes", "emoji": "⚽",
     "description": "…", "version": 1,
     "words": { "easy": [...], "medium": [...], "hard": [...] }
   }                                                                    */
(function () {
  const KEY = "ecos.packs.v1";
  const LEVELS = ["easy", "medium", "hard"];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { return []; }
  }
  function store(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {}
  }

  let stored = load(); // descargados + propios

  function count(p) { return LEVELS.reduce((n, k) => n + (p.words?.[k]?.length || 0), 0); }

  function all() {
    const map = new Map();
    (window.BUILTIN_PACKS || []).forEach(p => map.set(p.id, { ...p, source: "builtin" }));
    stored.forEach(p => map.set(p.id, { ...p, source: p.source || "download" }));
    return [...map.values()];
  }

  function get(id) { return all().find(p => p.id === id); }

  /* Limpia y valida un temario recibido de fuera. Devuelve null si no vale. */
  function sanitize(raw) {
    if (!raw || typeof raw !== "object") return null;
    const clean = arr => (Array.isArray(arr) ? arr : [])
      .filter(w => typeof w === "string")
      .map(w => w.replace(/\s+/g, " ").trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 500);
    const words = {};
    LEVELS.forEach(k => (words[k] = clean(raw.words?.[k])));
    // Acepta también una lista simple: "words": ["a","b"]
    if (Array.isArray(raw.words)) words.medium = clean(raw.words);
    const name = String(raw.name || "").trim().slice(0, 40);
    if (!name || !count({ words })) return null;
    const lang = /^[a-z]{2}$/.test(raw.lang) ? raw.lang : I18N.lang;
    const id = /^[a-z0-9-]{2,60}$/.test(raw.id) ? raw.id : `${lang}-custom-${Date.now().toString(36)}`;
    return {
      format: "ecos-al-reves/pack@1", id, lang, name,
      emoji: String(raw.emoji || "📦").slice(0, 8),
      description: String(raw.description || "").slice(0, 140),
      version: Number(raw.version) || 1,
      words
    };
  }

  function save(pack, source) {
    const p = { ...pack, source };
    stored = stored.filter(x => x.id !== p.id).concat(p);
    store(stored);
    return p;
  }

  function remove(id) {
    stored = stored.filter(x => x.id !== id);
    store(stored);
  }

  async function fetchJSON(path) {
    let lastErr;
    for (const base of window.APP_CONFIG.packsBaseUrls) {
      try {
        const res = await fetch(base + path, { cache: "no-cache" });
        if (!res.ok) throw new Error(res.status);
        return await res.json();
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }

  async function catalog() {
    const data = await fetchJSON("catalog.json");
    return (data.packs || []).filter(p => p && p.id && p.path);
  }

  async function download(entry) {
    const raw = await fetchJSON(entry.path);
    const p = sanitize(raw);
    if (!p) throw new Error("invalid");
    return save(p, "download");
  }

  function exportText(pack) {
    const { source, builtin, ...rest } = pack;
    return JSON.stringify({ ...rest, format: "ecos-al-reves/pack@1" }, null, 2);
  }

  function importText(text) {
    let raw;
    try { raw = JSON.parse(text); } catch (_) { return null; }
    const p = sanitize(raw);
    if (!p) return null;
    // Si choca con un temario incluido, se guarda como copia propia
    if ((window.BUILTIN_PACKS || []).some(b => b.id === p.id)) p.id = p.id + "-copy";
    return save(p, "custom");
  }

  /* Baraja de palabras para una partida */
  function deck(ids, difficulty) {
    const levels = difficulty === "mixed" ? LEVELS : [difficulty];
    const words = [];
    ids.forEach(id => {
      const p = get(id);
      if (p) levels.forEach(l => (p.words[l] || []).forEach(w => words.push(w)));
    });
    const uniq = [...new Set(words)];
    for (let i = uniq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniq[i], uniq[j]] = [uniq[j], uniq[i]];
    }
    return uniq;
  }

  window.Packs = { all, get, count, sanitize, save, remove, catalog, download, exportText, importText, deck, LEVELS };
})();
