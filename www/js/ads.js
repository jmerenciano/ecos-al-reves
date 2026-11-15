/* Publicidad con AdMob (plugin @capacitor-community/admob).
   En la web todo esto no hace nada y el juego funciona igual.
   Reglas que seguimos para que los anuncios no molesten:
   - nunca durante una grabación o mientras suena una voz;
   - pantalla completa solo entre turnos y como mucho cada pocos minutos;
   - vídeos con recompensa solo cuando el jugador lo elige;
   - solo anuncios aptos para todos los públicos (clasificación G). */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.ads) || { enabled: false };
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const platform = native ? cap.getPlatform() : "web";

  let AdMob = null;
  let ready = false;
  let interstitialReady = false;
  let rewardedReady = false;
  let turns = 0;
  let lastShown = Date.now(); // no mostrar nada nada más abrir la app
  let privacyOptions = false;

  const ids = () => ((cfg.useTestAds ? cfg.testIds : cfg.ids) || {})[platform] || {};

  const noAds = () => !!(window.Purchases && window.Purchases.adsRemoved);

  async function init() {
    if (!native || !cfg.enabled || noAds()) return;
    AdMob = (cap.Plugins && cap.Plugins.AdMob) || (cap.registerPlugin && cap.registerPlugin("AdMob"));
    if (!AdMob) return;
    try {
      await AdMob.initialize({
        initializeForTesting: !!cfg.useTestAds,
        maxAdContentRating: "General",
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false
      });
      // Consentimiento (RGPD en Europa y otras leyes de privacidad)
      try {
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === "REQUIRED") await AdMob.showConsentForm();
        privacyOptions = !!info.isConsentFormAvailable;
      } catch (_) {}
      // iOS: permiso de seguimiento (App Tracking Transparency)
      if (platform === "ios") {
        try {
          const s = await AdMob.trackingAuthorizationStatus();
          if (s.status === "notDetermined") await AdMob.requestTrackingAuthorization();
        } catch (_) {}
      }
      ready = true;
      preloadInterstitial();
      preloadRewarded();
    } catch (e) {
      console.warn("AdMob no disponible", e);
    }
  }

  async function preloadInterstitial() {
    if (!ready || interstitialReady || !ids().interstitial) return;
    try { await AdMob.prepareInterstitial({ adId: ids().interstitial }); interstitialReady = true; } catch (_) {}
  }

  async function preloadRewarded() {
    if (!ready || rewardedReady || !ids().rewarded) return;
    try { await AdMob.prepareRewardVideoAd({ adId: ids().rewarded }); rewardedReady = true; } catch (_) {}
  }

  async function showInterstitial() {
    if (!ready || !interstitialReady) { preloadInterstitial(); return; }
    interstitialReady = false;
    try { await AdMob.showInterstitial(); lastShown = Date.now(); } catch (_) {}
    preloadInterstitial();
  }

  /* Se llama al terminar cada turno. isLast: fin de la partida. */
  async function afterTurn(isLast) {
    if (noAds()) return;
    turns++;
    const waited = (Date.now() - lastShown) / 1000;
    const every = cfg.interstitialEveryTurns || 4;
    const min = cfg.minSecondsBetween || 150;
    if (waited >= min && (turns % every === 0 || isLast)) {
      turns = 0;
      await showInterstitial();
    }
  }

  /* Vídeo con recompensa. Devuelve true si hay que dar el premio.
     Si el anuncio no carga, damos el premio igualmente: no es culpa del jugador. */
  async function rewarded() {
    if (!ready || noAds()) return true;
    if (!rewardedReady) await preloadRewarded();
    if (!rewardedReady) return true;
    rewardedReady = false;
    let earned = false;
    let handle;
    try {
      handle = await AdMob.addListener("onRewardedVideoAdReward", () => { earned = true; });
      const item = await AdMob.showRewardVideoAd();
      if (item && (item.amount !== undefined || item.type)) earned = true;
      lastShown = Date.now();
    } catch (_) {
      earned = true;
    } finally {
      try { handle && handle.remove(); } catch (_) {}
      preloadRewarded();
    }
    return earned;
  }

  /* Permite cambiar el consentimiento en cualquier momento (obligatorio en Europa) */
  async function showPrivacyOptions() {
    try {
      if (typeof AdMob.showPrivacyOptionsForm === "function") return await AdMob.showPrivacyOptionsForm();
      await AdMob.resetConsentInfo();
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable) await AdMob.showConsentForm();
    } catch (_) {}
  }

  window.Ads = {
    init,
    afterTurn,
    rewarded,
    showPrivacyOptions,
    get available() { return ready && !noAds(); },
    get hasPrivacyOptions() { return ready && privacyOptions; }
  };
})();
