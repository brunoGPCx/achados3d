(function () {
  "use strict";

  var STORAGE_KEY = "achados3d_privacy_v1";
  var VERSION = 1;
  var preferences = readPreferences();
  var lastFocused = null;

  function readPreferences() {
    try {
      var stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (stored && stored.version === VERSION && typeof stored.analytics === "boolean" && typeof stored.marketing === "boolean") return stored;
    } catch (_) { /* no-op */ }
    return null;
  }

  function currentPreferences() {
    return preferences || { version: VERSION, analytics: false, marketing: false, savedAt: null };
  }

  function hasConsent(category) {
    return category === "essential" || currentPreferences()[category] === true;
  }

  function savePreferences(analytics, marketing) {
    preferences = {
      version: VERSION,
      analytics: Boolean(analytics),
      marketing: Boolean(marketing),
      savedAt: new Date().toISOString()
    };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch (_) { /* no-op */ }
    hideBanner();
    closePreferences();
    window.dispatchEvent(new CustomEvent("achados3d:consentchange", { detail: currentPreferences() }));
  }

  function banner() { return document.getElementById("privacy-banner"); }
  function modal() { return document.getElementById("privacy-modal"); }
  function hideBanner() { if (banner()) banner().hidden = true; }

  function openPreferences() {
    var dialog = modal();
    if (!dialog) return;
    lastFocused = document.activeElement;
    document.getElementById("privacy-analytics").checked = hasConsent("analytics");
    document.getElementById("privacy-marketing").checked = hasConsent("marketing");
    dialog.hidden = false;
    document.body.classList.add("privacy-modal-open");
    document.getElementById("privacy-modal-title").focus();
  }

  function closePreferences() {
    var dialog = modal();
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    document.body.classList.remove("privacy-modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function injectInterface() {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = '<aside class="privacy-banner" id="privacy-banner" aria-label="Preferências de privacidade" hidden>' +
      '<div class="privacy-banner__copy"><p class="privacy-banner__eyebrow">Sua privacidade</p><h2 class="privacy-banner__title">Você controla os dados opcionais</h2>' +
      '<p class="privacy-banner__text">Usamos tecnologias de análise para medir acessos e, com sua autorização, recursos de marketing para avaliar anúncios. <a href="/privacidade.html">Leia o aviso de privacidade</a>.</p></div>' +
      '<div class="privacy-banner__actions"><button class="privacy-button privacy-button--text" data-privacy-action="reject" type="button">Recusar opcionais</button>' +
      '<button class="privacy-button" data-privacy-action="settings" type="button">Configurar</button>' +
      '<button class="privacy-button privacy-button--primary" data-privacy-action="accept" type="button">Aceitar todos</button></div></aside>' +
      '<div class="privacy-modal" id="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title" hidden>' +
      '<div class="privacy-modal__dialog"><div class="privacy-modal__head"><div><p>Preferências</p><h2 id="privacy-modal-title" tabindex="-1">Configurar privacidade</h2></div>' +
      '<button class="privacy-modal__close" data-privacy-action="close" type="button" aria-label="Fechar">×</button></div>' +
      '<div class="privacy-modal__body"><div class="privacy-option"><div><strong>Funcionamento essencial</strong><p>Carrega a página, escolhe o grupo ativo e memoriza sua escolha de privacidade.</p></div><span class="privacy-always">Sempre ativo</span></div>' +
      '<div class="privacy-option"><div><strong>Métricas anônimas</strong><p>Mede sessões, páginas e cliques para entendermos o desempenho do site.</p></div><label class="privacy-switch"><input id="privacy-analytics" type="checkbox" aria-label="Permitir métricas anônimas"><span></span></label></div>' +
      '<div class="privacy-option"><div><strong>Marketing e anúncios</strong><p>Permite ativar o Meta Pixel quando ele for configurado, para medir e melhorar campanhas.</p></div><label class="privacy-switch"><input id="privacy-marketing" type="checkbox" aria-label="Permitir marketing e anúncios"><span></span></label></div>' +
      '<p class="privacy-modal__note">Você pode mudar esta escolha a qualquer momento no rodapé. Saiba mais no <a href="/privacidade.html">aviso de privacidade</a>.</p>' +
      '<div class="privacy-modal__actions"><button class="privacy-button privacy-button--text" data-privacy-action="reject" type="button">Recusar opcionais</button><button class="privacy-button privacy-button--primary" data-privacy-action="save" type="button">Salvar preferências</button></div></div></div></div>';
    while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);

    document.addEventListener("click", function (event) {
      var control = event.target.closest("[data-privacy-action], [data-open-privacy]");
      if (!control) return;
      if (control.hasAttribute("data-open-privacy")) { openPreferences(); return; }
      var action = control.getAttribute("data-privacy-action");
      if (action === "accept") savePreferences(true, true);
      if (action === "reject") savePreferences(false, false);
      if (action === "settings") openPreferences();
      if (action === "close") closePreferences();
      if (action === "save") savePreferences(document.getElementById("privacy-analytics").checked, document.getElementById("privacy-marketing").checked);
    });

    modal().addEventListener("click", function (event) { if (event.target === modal()) closePreferences(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !modal().hidden) closePreferences(); });
    if (!preferences) banner().hidden = false;
  }

  window.AchadosPrivacy = {
    getPreferences: currentPreferences,
    hasConsent: hasConsent,
    openPreferences: openPreferences
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectInterface);
  else injectInterface();
})();
