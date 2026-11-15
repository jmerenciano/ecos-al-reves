/* Compra única «Quitar anuncios» (plugin cordova-plugin-purchase).
   Funciona con Google Play y App Store sin servidor propio: la tienda
   confirma la compra y la guardamos también en el dispositivo.
   Quitar anuncios incluye además todos los temarios Especiales.
   En la web no hay anuncios, así que no se muestra nada. */
(function () {
  const cfg = (window.APP_CONFIG && window.APP_CONFIG.purchases) || { enabled: false };
  const KEY = "ecos.noads.v1";
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());

  let owned = false;
  try { owned = localStorage.getItem(KEY) === "1"; } catch (_) {}
  let product = null;
  let ready = false;
  const listeners = [];
  const notify = () => listeners.forEach(f => { try { f(); } catch (_) {} });

  function setOwned() {
    if (owned) return;
    owned = true;
    try { localStorage.setItem(KEY, "1"); } catch (_) {}
    notify();
  }

  function init() {
    return new Promise(resolve => {
      if (!native || !cfg.enabled) return resolve();
      const timer = setTimeout(resolve, 8000); // no bloquear el juego si la tienda tarda
      const start = () => {
        const C = window.CdvPurchase;
        if (!C) { clearTimeout(timer); return resolve(); }
        const { store, ProductType, Platform } = C;
        const platform = cap.getPlatform() === "ios" ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
        const refresh = () => {
          product = store.get(cfg.removeAdsId, platform) || null;
          if (product && product.owned) setOwned();
          notify();
        };
        store.register([{ id: cfg.removeAdsId, type: ProductType.NON_CONSUMABLE, platform }]);
        store.when()
          .approved(t => t.verify())
          .verified(r => r.finish())
          .finished(refresh)
          .productUpdated(refresh)
          .receiptUpdated(refresh);
        store.error(e => console.warn("Compras:", e && e.message));
        store.initialize([platform])
          .then(() => { ready = true; refresh(); })
          .catch(() => {})
          .finally(() => { clearTimeout(timer); resolve(); });
      };
      if (window.CdvPurchase) start();
      else document.addEventListener("deviceready", start, { once: true });
    });
  }

  /* Devuelve true si se ha comprado, false si se canceló. Lanza error si falla. */
  async function buy() {
    const offer = product && product.getOffer && product.getOffer();
    if (!offer) throw new Error("unavailable");
    const err = await offer.order();
    if (err) {
      if (err.code === window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) return false;
      throw err;
    }
    return true;
  }

  async function restore() {
    await window.CdvPurchase.store.restorePurchases();
    if (product && product.owned) setOwned();
    return owned;
  }

  window.Purchases = {
    init,
    buy,
    restore,
    onChange: f => listeners.push(f),
    get adsRemoved() { return owned; },
    /* Hay tienda y producto: se puede mostrar la opción */
    get available() { return ready && !!product; },
    get price() { return (product && product.pricing && product.pricing.price) || ""; }
  };
})();
