// Regenera www/packs/catalog.json y www/js/builtin-packs.js a partir de
// los archivos www/packs/<idioma>/<temario>.json.
// Uso: npm run packs
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = join(root, "www", "packs");

const catalog = [];
const builtin = [];

for (const lang of readdirSync(packsDir).sort()) {
  const dir = join(packsDir, lang);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
    const pack = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const words = pack.words || {};
    const count = ["easy", "medium", "hard"].reduce((n, k) => n + (words[k]?.length || 0), 0);
    if (!pack.id || !pack.lang || !pack.name || !count) {
      throw new Error(`Temario incompleto: ${lang}/${file}`);
    }
    catalog.push({
      id: pack.id, lang: pack.lang, name: pack.name, emoji: pack.emoji || "📦",
      description: pack.description || "", version: pack.version || 1,
      count, builtin: !!pack.builtin, premium: !!pack.premium, path: `${lang}/${file}`
    });
    if (pack.builtin) builtin.push(pack);
  }
}

writeFileSync(join(packsDir, "catalog.json"),
  JSON.stringify({ format: "ecos-al-reves/catalog@1", packs: catalog }, null, 2) + "\n");
writeFileSync(join(root, "www", "js", "builtin-packs.js"),
  "/* Generado por scripts/build-packs.mjs. No editar a mano. */\n" +
  "window.BUILTIN_PACKS = " + JSON.stringify(builtin) + ";\n");

console.log(`Catálogo: ${catalog.length} temarios (${builtin.length} incluidos en la app).`);
