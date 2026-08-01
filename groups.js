(function () {
  "use strict";

  var PROJECT_ID = "achados3d-metricas-bruno";
  var API_KEY = "AIzaSyDiEAA8o0X9JghlJgJuao0icYbEeZ0sjf8";
  var CONFIG_URL = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID +
    "/databases/(default)/documents/public/site?key=" + encodeURIComponent(API_KEY);
  var buttons = document.querySelectorAll("#cta-top, #cta-main, #cta-final, #cta-sticky");

  function stringField(fields, name) {
    return fields && fields[name] && typeof fields[name].stringValue === "string"
      ? fields[name].stringValue
      : "";
  }

  function validWhatsAppLink(value) {
    try {
      var url = new URL(value);
      return url.protocol === "https:" && url.hostname === "chat.whatsapp.com" && url.pathname.length > 2;
    } catch (_) {
      return false;
    }
  }

  function applyGroup(group) {
    buttons.forEach(function (button) {
      button.href = group.url;
      button.dataset.groupId = group.id;
      button.removeAttribute("aria-disabled");
    });
  }

  function disableButtons() {
    buttons.forEach(function (button) {
      button.removeAttribute("href");
      button.setAttribute("aria-disabled", "true");
      button.addEventListener("click", function (event) { event.preventDefault(); });
      var label = button.querySelector("span");
      if (label) label.textContent = "Grupos temporariamente lotados";
    });
  }

  fetch(CONFIG_URL, { mode: "cors", credentials: "omit" })
    .then(function (response) {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (documentData) {
      if (!documentData) return;
      var fields = documentData.fields || {};
      var available = fields.available && fields.available.booleanValue === true;
      var group = {
        id: stringField(fields, "groupId"),
        name: stringField(fields, "groupName"),
        url: stringField(fields, "url")
      };
      if (available && validWhatsAppLink(group.url)) applyGroup(group);
      else disableButtons();
    })
    .catch(function () {
      // Keep the static fallback link if the configuration service is unavailable.
    });
})();
