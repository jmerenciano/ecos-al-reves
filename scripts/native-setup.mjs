// Prepara los proyectos nativos generados por Capacitor:
//  - permiso de micrófono (Android e iOS)
//  - ID de la app de AdMob, SKAdNetwork y permiso de seguimiento (iOS)
// Los IDs se leen de www/js/config.js (test o reales según useTestAds).
// Uso: npm run android:init / npm run ios:init (y cada vez que cambies los IDs).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.runInNewContext(readFileSync("www/js/config.js", "utf8"), sandbox);
const ads = sandbox.window.APP_CONFIG.ads;
const idSet = ads.useTestAds ? ads.testIds : ads.ids;

/* ---------- Android ---------- */
const manifest = "android/app/src/main/AndroidManifest.xml";
if (existsSync(manifest)) {
  let xml = readFileSync(manifest, "utf8");
  for (const perm of ["android.permission.RECORD_AUDIO", "android.permission.MODIFY_AUDIO_SETTINGS", "com.google.android.gms.permission.AD_ID"]) {
    if (!xml.includes(perm)) xml = xml.replace("</manifest>", `    <uses-permission android:name="${perm}" />\n</manifest>`);
  }
  const meta = `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${idSet.android.appId}"/>`;
  if (xml.includes("com.google.android.gms.ads.APPLICATION_ID")) {
    xml = xml.replace(/<meta-data android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>/, meta);
  } else {
    xml = xml.replace("</application>", `    ${meta}\n    </application>`);
  }
  writeFileSync(manifest, xml);
  console.log(`Android: micrófono + AdMob (${ads.useTestAds ? "PRUEBA" : "REAL"}) configurados.`);
}

/* Versión: versionName sale de package.json y versionCode de la variable
   VERSION_CODE (en GitHub Actions, el número de ejecución), que debe crecer
   en cada subida a Google Play. */
const gradle = "android/app/build.gradle";
if (existsSync(gradle)) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const code = parseInt(process.env.VERSION_CODE || "1", 10);
  let g = readFileSync(gradle, "utf8");
  g = g.replace(/versionCode \d+/, `versionCode ${code}`).replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
  writeFileSync(gradle, g);
  console.log(`Android: versión ${pkg.version} (código ${code}).`);
}

/* ---------- iOS ---------- */
const plist = "ios/App/App/Info.plist";
if (existsSync(plist)) {
  let xml = readFileSync(plist, "utf8");
  const setKey = (key, valueXml) => {
    const re = new RegExp(`\\s*<key>${key}</key>\\s*(<string>[^<]*</string>|<array>[\\s\\S]*?</array>)`);
    xml = xml.replace(re, "");
    xml = xml.replace(/<dict>/, `<dict>\n\t<key>${key}</key>\n\t${valueXml}`);
  };
  setKey("NSMicrophoneUsageDescription", "<string>Ecos al Revés usa el micrófono para grabar tu voz y reproducirla al revés. Las grabaciones no se guardan ni se envían.</string>");
  setKey("NSUserTrackingUsageDescription", "<string>Se usa para mostrar anuncios más relevantes y mantener el juego gratis.</string>");
  setKey("GADApplicationIdentifier", `<string>${idSet.ios.appId}</string>`);
  // Lista básica de SKAdNetwork de Google. Puedes ampliarla con la que da AdMob.
  setKey("SKAdNetworkItems", `<array>
\t\t<dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>
\t</array>`);
  writeFileSync(plist, xml);
  console.log(`iOS: micrófono + AdMob (${ads.useTestAds ? "PRUEBA" : "REAL"}) configurados.`);
}
