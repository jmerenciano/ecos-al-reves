# Publicar Ecos al Revés en Google Play, paso a paso

Imágenes para la ficha: carpeta [`docs/play-store/`](play-store/).
Textos de la ficha en 7 idiomas: [`docs/fichas-tiendas.md`](fichas-tiendas.md).

---

## Paso 1 · Crear la cuenta de desarrollador (25 $, una vez)

1. Entra en <https://play.google.com/console/signup> con la cuenta de Google que usarás siempre para el juego.
2. Tipo de cuenta: **Personal** (solo pide DNI). *Organización* solo si tienes empresa: pide un número D-U-N-S y tarda semanas.
3. Nombre de desarrollador: el que verá la gente en la tienda (por ejemplo `jmerenciano`).
4. Paga los 25 $ y **verifica tu identidad** con el DNI (de horas a 3 días).
5. Verifica que tienes un móvil Android instalando la app **Google Play Console** e iniciando sesión.

## Paso 2 · Poner la llave de firma en GitHub (una sola vez)

Abre el archivo `llave-secretos-github.txt` que te he pasado. Luego:

1. En GitHub: repositorio → **Settings → Secrets and variables → Actions → New repository secret**.
2. Crea los 4 secretos copiando nombre y valor del archivo:
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
3. Guarda el archivo `.jks` y el `.txt` en un sitio seguro (gestor de contraseñas o Drive privado). Si se pierden, Google puede cambiar la llave de subida, pero tarda días.

## Paso 3 · Generar la versión final (.aab)

1. GitHub → **Actions → Versión Google Play → Run workflow**.
2. Al terminar (unos 5 min), abre la ejecución y descarga **ecos-al-reves-google-play** en *Artifacts*. Dentro está el `.aab`.
3. Cada vez que quieras subir una actualización, repite este paso: el número de versión sube solo.

## Paso 4 · Crear la app en Play Console

**Crear app**:

- Nombre: `Ecos al Revés: habla al revés`
- Idioma predeterminado: **Español (España)**
- App o juego: **Juego** · Gratis o de pago: **Gratis**
- Acepta las declaraciones.

## Paso 5 · «Configura tu app» (Panel → tareas)

| Tarea | Qué responder |
|---|---|
| **Política de privacidad** | `https://jmerenciano.github.io/ecos-al-reves/privacy.html` |
| **Acceso a la app** | Todas las funciones están disponibles sin restricciones |
| **Anuncios** | **Sí**, mi app contiene anuncios |
| **Clasificación del contenido** | Ver tabla de abajo |
| **Público objetivo** | Edades **13-15, 16-17 y 18+**. Responde con sinceridad a las preguntas sobre si puede atraer a niños |
| **Apps de noticias** | No |
| **Apps gubernamentales / financieras / de salud** | No |
| **Seguridad de los datos** | Ver tabla de abajo |
| **Categoría** | Juego → **Casual**. Etiquetas: *Fiesta, Familia, Multijugador local* (las que ofrezca) |
| **Datos de contacto** | Tu correo de contacto (se muestra en la tienda) |

### Cuestionario de clasificación (IARC)

- Categoría: **Juego**.
- Violencia, miedo, sexualidad, lenguaje soez, drogas, apuestas: **No** a todo.
- ¿Los usuarios pueden interactuar o compartir contenido entre ellos? **No** (todo es en el mismo móvil y no se envía nada).
- ¿Comparte la ubicación del usuario con otros usuarios? **No**.
- ¿Permite compras digitales? **Sí** («Quitar anuncios»).
- ¿Contiene anuncios? **Sí**.

Resultado esperado: **PEGI 3 / Para todos**.

### Seguridad de los datos

Las grabaciones de voz **no se recogen**: se procesan en el móvil y se borran. Lo que sí se recoge es lo que usa **AdMob** (el SDK de anuncios de Google):

- ¿Tu app recoge o comparte datos de usuario? **Sí**.
- ¿Todos los datos están cifrados en tránsito? **Sí**.
- ¿Ofreces una forma de pedir que se eliminen los datos? **No** (no hay cuentas; los datos de anuncios los gestiona Google).

| Tipo de dato | Recogido | Compartido | Para qué |
|---|---|---|---|
| **Ubicación → Ubicación aproximada** (por la IP) | Sí | Sí | Publicidad, Prevención de fraudes |
| **Actividad en la app → Interacciones con la app** | Sí | Sí | Publicidad, Analíticas |
| **Info. y rendimiento de la app → Registros de fallos y Diagnóstico** | Sí | Sí | Publicidad, Analíticas |
| **ID de dispositivo u otros** (ID de publicidad) | Sí | Sí | Publicidad, Prevención de fraudes |

Para cada uno: tratamiento **efímero: No** · **obligatorio** (los usuarios no pueden desactivarlo, salvo el consentimiento de anuncios en Europa).

## Paso 6 · Ficha de la tienda

**Crecer → Presencia en Play Store → Ficha principal**:

- **Nombre**, **descripción breve** y **descripción completa**: copia los de [`fichas-tiendas.md`](fichas-tiendas.md) (español).
- **Icono**: `docs/play-store/icono-512.png`
- **Gráfico destacado**: `docs/play-store/grafico-destacado-1024x500.png`
- **Capturas del teléfono**: las 5 de `docs/play-store/capturas-es/`

**Añadir traducciones** (botón *Gestionar traducciones → Añadir tus propias traducciones*): inglés, catalán, francés, portugués, italiano y alemán, con los textos de `fichas-tiendas.md`. Para inglés usa las capturas de `docs/play-store/capturas-en/`.

## Paso 7 · Primera subida: prueba interna

1. **Probar → Prueba interna → Crear nueva versión**.
2. **Firma de apps de Google Play**: acepta la opción recomendada (Google guarda la llave definitiva).
3. Sube el `.aab` del paso 3. Notas de la versión: `Primera versión`.
4. **Testers**: crea una lista con tu correo y el de tu familia → guarda → copia el **enlace de participación** e instálala desde ese enlace.

Con la app ya subida, puedes crear el producto de compra:

**Monetizar → Productos → Productos integrados en la aplicación → Crear producto**:

- ID del producto: `remove_ads` (exactamente así)
- Nombre: `Quitar anuncios` · Descripción: `Sin anuncios para siempre y todos los temarios Especiales`
- Precio: por ejemplo **2,99 €** (Google calcula el resto de países) → **Activar**.

Para poder cobrar, completa **Configuración → Perfil de pagos** (datos bancarios y fiscales).

## Paso 8 · Prueba cerrada obligatoria (cuentas personales nuevas)

Google exige a las cuentas personales nuevas una **prueba cerrada con al menos 12 personas durante 14 días seguidos** antes de publicar para todo el mundo.

1. **Probar → Prueba cerrada → Crear pista** → sube el mismo `.aab` (o uno nuevo).
2. Testers: añade al menos **12 correos de Gmail** (familia, amigos, compañeros) o un Grupo de Google.
3. Mándales el enlace de participación: tienen que **aceptar e instalar** la app y no desinstalarla durante 14 días.
4. Pasados los 14 días: **Panel → Solicitar acceso a producción** y responde a las preguntas sobre la prueba.

## Paso 9 · Publicación mundial

1. **Producción → Países/regiones → Añadir todos**.
2. **Crear nueva versión** → elige el `.aab` → **Enviar a revisión**.
3. Revisión de Google: normalmente de 1 a 7 días.

## Anuncios reales (cuando la app ya esté en Play)

1. En AdMob, vincula la app con la ficha de Google Play (*Configuración de la app → Tienda de aplicaciones*).
2. Pásame el **ID de la app** y los IDs de los bloques **Intersticial** y **Bonificado**. Los pongo en `www/js/config.js` y cambio `useTestAds` a `false`.
3. Generas una versión nueva (paso 3) y la subes.
