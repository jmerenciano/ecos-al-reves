/* Configuración general. */
window.APP_CONFIG = {
  /* De dónde se descarga el catálogo de temarios, en orden.
     La primera es el repositorio de GitHub (así puedes publicar temarios
     nuevos sin actualizar la app); la segunda es la copia local. */
  packsBaseUrls: [
    "https://raw.githubusercontent.com/jmerenciano/ecos-al-reves/main/www/packs/",
    "packs/"
  ],

  /* Publicidad con Google AdMob (solo en las apps de Android e iOS; en la
     web no se muestran anuncios).
     1. Crea tu cuenta en https://admob.google.com y añade las dos apps.
     2. Copia aquí tus IDs reales en "ids" y pon useTestAds: false.
     Mientras useTestAds sea true se usan los anuncios de prueba de Google:
     NUNCA pulses tus propios anuncios reales o AdMob puede cerrar la cuenta. */
  ads: {
    enabled: true,
    useTestAds: true,
    interstitialEveryTurns: 4,   // un anuncio a pantalla completa cada N turnos…
    minSecondsBetween: 150,      // …y nunca dos seguidos con menos de 2,5 minutos
    ids: {
      android: {
        appId: "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
        interstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
        rewarded: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
      },
      ios: {
        appId: "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
        interstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
        rewarded: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
      }
    },
    /* IDs públicos de prueba de Google. No los cambies. */
    testIds: {
      android: {
        appId: "ca-app-pub-3940256099942544~3347511713",
        interstitial: "ca-app-pub-3940256099942544/1033173712",
        rewarded: "ca-app-pub-3940256099942544/5224354917"
      },
      ios: {
        appId: "ca-app-pub-3940256099942544~1458002511",
        interstitial: "ca-app-pub-3940256099942544/4411468910",
        rewarded: "ca-app-pub-3940256099942544/1712485313"
      }
    }
  }
};
