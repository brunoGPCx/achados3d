(function () {
  "use strict";

  var PROJECT_ID = "achados3d-metricas-bruno";
  var API_KEY = "AIzaSyDiEAA8o0X9JghlJgJuao0icYbEeZ0sjf8";
  var EVENTS_URL = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID +
    "/databases/(default)/documents/events";
  var SESSION_KEY = "achados3d_analytics_session";
  var STARTED_KEY = "achados3d_analytics_started";
  var CLICKED_KEY = "achados3d_analytics_clicked";
  var analyticsStarted = false;

  function hasAnalyticsConsent() {
    return Boolean(window.AchadosPrivacy && window.AchadosPrivacy.hasConsent("analytics"));
  }

  function startAnalytics() {
  if (analyticsStarted) return;
  analyticsStarted = true;

  function randomId() {
    if (window.crypto && window.crypto.getRandomValues) {
      var values = new Uint32Array(4);
      window.crypto.getRandomValues(values);
      return Array.prototype.map.call(values, function (value) {
        return value.toString(16).padStart(8, "0");
      }).join("");
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 18);
  }

  function storageGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (_) { return null; }
  }

  function storageSet(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (_) { /* no-op */ }
  }

  function clean(value, limit) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, limit);
  }

  function saoPauloDay() {
    try {
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(new Date());
      var date = {};
      parts.forEach(function (part) { date[part.type] = part.value; });
      return date.year + "-" + date.month + "-" + date.day;
    } catch (_) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function referrerHost() {
    if (!document.referrer) return "";
    try { return new URL(document.referrer).hostname; } catch (_) { return ""; }
  }

  var sessionId = storageGet(SESSION_KEY);
  if (!sessionId || !/^[A-Za-z0-9_-]{16,64}$/.test(sessionId)) {
    sessionId = randomId();
    storageSet(SESSION_KEY, sessionId);
  }

  var search = new URLSearchParams(window.location.search);
  var day = saoPauloDay();

  function sendEvent(eventType, ctaId, groupId) {
    if (!hasAnalyticsConsent()) return Promise.resolve();
    var documentId = randomId();
    var body = {
      fields: {
        eventType: { stringValue: eventType },
        dayType: { stringValue: day + ":" + eventType },
        ctaId: { stringValue: clean(ctaId, 30) },
        groupId: { stringValue: clean(groupId, 64) },
        path: { stringValue: clean(window.location.pathname, 120) },
        sessionId: { stringValue: sessionId },
        source: { stringValue: clean(search.get("utm_source"), 100) },
        medium: { stringValue: clean(search.get("utm_medium"), 100) },
        campaign: { stringValue: clean(search.get("utm_campaign"), 100) },
        referrerHost: { stringValue: clean(referrerHost(), 160) },
        screen: { stringValue: clean(window.screen.width + "x" + window.screen.height, 30) },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };

    return fetch(EVENTS_URL + "?documentId=" + encodeURIComponent(documentId) + "&key=" + encodeURIComponent(API_KEY), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      mode: "cors",
      credentials: "omit"
    }).catch(function () {
      // Analytics must never interfere with the page or the WhatsApp button.
    });
  }

  if (!storageGet(STARTED_KEY)) {
    storageSet(STARTED_KEY, "1");
    sendEvent("session_start", "", "");
  }
  sendEvent("page_view", "", "");

  var buttons = document.querySelectorAll("#cta-top, #cta-main, #cta-final, #cta-sticky");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (storageGet(CLICKED_KEY)) return;
      storageSet(CLICKED_KEY, "1");
      sendEvent("cta_click", button.id, button.dataset.groupId || "grupo-1");
    });
  });
  }

  if (hasAnalyticsConsent()) startAnalytics();
  else window.addEventListener("achados3d:consentchange", function (event) {
    if (event.detail && event.detail.analytics) startAnalytics();
  });
})();
