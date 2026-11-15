// Añade el permiso de micrófono a los proyectos nativos generados por Capacitor.
// Se ejecuta solo con `npm run android:init` / `npm run ios:init`.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const manifest = "android/app/src/main/AndroidManifest.xml";
if (existsSync(manifest)) {
  let xml = readFileSync(manifest, "utf8");
  for (const perm of ["android.permission.RECORD_AUDIO", "android.permission.MODIFY_AUDIO_SETTINGS"]) {
    if (!xml.includes(perm)) {
      xml = xml.replace("</manifest>", `    <uses-permission android:name="${perm}" />\n</manifest>`);
    }
  }
  writeFileSync(manifest, xml);
  console.log("Android: permisos de micrófono añadidos.");
}

const plist = "ios/App/App/Info.plist";
if (existsSync(plist)) {
  let xml = readFileSync(plist, "utf8");
  if (!xml.includes("NSMicrophoneUsageDescription")) {
    xml = xml.replace(/<dict>/, `<dict>
	<key>NSMicrophoneUsageDescription</key>
	<string>Ecos al Revés usa el micrófono para grabar tu voz y reproducirla al revés.</string>`);
    writeFileSync(plist, xml);
  }
  console.log("iOS: descripción de uso del micrófono añadida.");
}
