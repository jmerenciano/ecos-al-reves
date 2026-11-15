/* Configuración general.
   packsBaseUrls: de dónde se descarga el catálogo de temarios, en orden.
   La primera es el repositorio de GitHub (así puedes publicar temarios
   nuevos sin actualizar la app); la segunda es la copia local. */
window.APP_CONFIG = {
  packsBaseUrls: [
    "https://raw.githubusercontent.com/jmerenciano/ecos-al-reves/main/www/packs/",
    "packs/"
  ]
};
