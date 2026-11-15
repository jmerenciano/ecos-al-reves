# 🎙️ Ecos al Revés

Juego de voz para jugar en familia, de 1 a 10 jugadores, con un solo móvil.

1. Lees una palabra en voz alta.
2. La app la reproduce **al revés** (y con efectos, si quieres).
3. Imitas ese sonido raro. Puedes escucharlo todas las veces que quieras, pero **solo se graba una vez**.
4. La app da la vuelta a tu imitación y… ¿suena como la palabra original? Los demás votan **Acierto** o **Fallo**.

## Modos

- **Solo**: cada jugador lee su palabra e imita su propia voz al revés.
- **Reto**: un jugador graba una palabra secreta, el siguiente la imita sin verla y tiene que adivinarla.

## Efectos

Clásico (solo al revés), Ardilla, Gigante, Robot, Cueva, Teléfono, Puzle y Marciano. En cada turno sale uno al azar entre los elegidos.

## Idiomas

Español, inglés, catalán/valenciano, francés, portugués, italiano y alemán. Los textos están en `www/js/i18n.js`.

## Temarios

- **Incluidos** en la app (funcionan sin internet): Deportes, Casa, Animales, Comida, y Viajes y lugares, en los 7 idiomas.
- **Catálogo descargable**: la app lee `www/packs/catalog.json` desde este repositorio de GitHub. Para publicar un temario nuevo no hace falta actualizar la app:
  1. Crea `www/packs/<idioma>/<nombre>.json` (copia uno existente como plantilla).
  2. Ejecuta `npm run packs` para regenerar el catálogo.
  3. Haz commit y push.
- **Propios**: desde *Gestionar temarios* puedes crear temarios, exportarlos (compartir archivo o copiar texto) e importarlos (archivo o pegar texto).

Si un temario lleva `"builtin": true`, se incluye dentro de la app al ejecutar `npm run packs`.

## Probar en local

```bash
npm run serve
```

Abre http://localhost:8080. El micrófono solo funciona en `localhost`, en una página `https://` o dentro de la app.

## Web (GitHub Pages)

El workflow `.github/workflows/pages.yml` publica la carpeta `www/` en cada push a `main`. Actívalo una vez en **Settings → Pages → Source: GitHub Actions**. La web quedará en `https://<usuario>.github.io/ecos-al-reves/` y se puede instalar en el móvil desde el navegador (Añadir a pantalla de inicio).

## App Android

- **APK de prueba sin instalar nada**: pestaña **Actions → APK Android → Run workflow**, y descarga el APK cuando termine.
- **En tu ordenador** (necesita Android Studio):
  ```bash
  npm install
  npm run android:init
  npm run sync
  npm run android:open
  ```
  Para publicarla en Google Play necesitas una cuenta de desarrollador (pago único de 25 $) y generar un AAB firmado desde Android Studio.

## App iOS

Necesita un Mac con Xcode y, para publicar en la App Store, una cuenta de Apple Developer (99 $/año).

```bash
npm install
npm run ios:init
npm run sync
npm run ios:open
```

## Estructura

```
www/                 la app (HTML, CSS, JS): es lo que se publica y se empaqueta
  js/app.js          pantallas y lógica de la partida
  js/audio.js        micrófono, inversión y efectos de sonido
  js/i18n.js         textos en todos los idiomas
  js/packs.js        temarios: catálogo, descarga, importar y exportar
  js/config.js       dirección del catálogo online
  packs/             temarios en JSON + catalog.json
scripts/             generador del catálogo y permisos nativos de micrófono
capacitor.config.json  configuración de las apps Android/iOS
```
