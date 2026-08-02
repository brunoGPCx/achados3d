(function () {
  "use strict";

  var PROJECT_ID = "achados3d-metricas-bruno";
  var API_KEY = "AIzaSyDiEAA8o0X9JghlJgJuao0icYbEeZ0sjf8";
  var DOCUMENTS_URL = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID +
    "/databases/(default)/documents/";
  var CONFIG_URL = DOCUMENTS_URL + "public/site?key=" + encodeURIComponent(API_KEY);
  var buttons = document.querySelectorAll("#cta-top, #cta-main, #cta-final, #cta-sticky");
  var resolveRouting;

  window.achados3dRoutingReady = new Promise(function (resolve) {
    resolveRouting = resolve;
  });

  function stringField(fields, name) {
    return fields && fields[name] && typeof fields[name].stringValue === "string"
      ? fields[name].stringValue
      : "";
  }

  function numberField(fields, name, fallback) {
    var field = fields && fields[name];
    var value = field && (field.integerValue !== undefined ? field.integerValue : field.doubleValue);
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function booleanField(fields, name, fallback) {
    var field = fields && fields[name];
    return field && typeof field.booleanValue === "boolean" ? field.booleanValue : fallback;
  }

  function validWhatsAppLink(value) {
    try {
      var url = new URL(value);
      return url.protocol === "https:" && url.hostname === "chat.whatsapp.com" && url.pathname.length > 2;
    } catch (_) {
      return false;
    }
  }

  function parseGroups(fields) {
    var values = fields && fields.groups && fields.groups.arrayValue && fields.groups.arrayValue.values;
    if (!Array.isArray(values)) return [];
    return values.map(function (value) {
      var groupFields = value && value.mapValue && value.mapValue.fields || {};
      return {
        id: stringField(groupFields, "id"),
        name: stringField(groupFields, "name"),
        url: stringField(groupFields, "url"),
        status: stringField(groupFields, "status"),
        order: numberField(groupFields, "order", 0),
        autoRoute: booleanField(groupFields, "autoRoute", false),
        routeRevision: stringField(groupFields, "routeRevision")
      };
    }).sort(function (first, second) { return first.order - second.order; });
  }

  function parseCounter(documentData) {
    if (!documentData || !documentData.fields) return null;
    var fields = documentData.fields;
    return {
      groupId: stringField(fields, "groupId"),
      clicks: Math.max(0, numberField(fields, "clicks", 0)),
      baselineMembers: Math.max(0, numberField(fields, "baselineMembers", 0)),
      switchAt: Math.max(0, numberField(fields, "switchAt", 0)),
      revision: stringField(fields, "revision")
    };
  }

  function fetchCounter(group) {
    if (!group.autoRoute || !group.id) return Promise.resolve(null);
    var url = DOCUMENTS_URL + "routingCounters/" + encodeURIComponent(group.id) +
      "?key=" + encodeURIComponent(API_KEY);
    return fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" })
      .then(function (response) {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(parseCounter)
      .catch(function () { return null; });
  }

  function isEstimatedFull(group, counter) {
    return Boolean(group.autoRoute && counter && counter.groupId === group.id && counter.switchAt > 0 &&
      (!group.routeRevision || counter.revision === group.routeRevision) &&
      counter.baselineMembers + counter.clicks >= counter.switchAt);
  }

  function applyGroup(group, counter) {
    buttons.forEach(function (button) {
      button.href = group.url;
      button.dataset.groupId = group.id;
      button.dataset.autoCounter = counter && group.autoRoute && (!group.routeRevision || counter.revision === group.routeRevision) ? "1" : "0";
      button.removeAttribute("aria-disabled");
    });
    var routing = {
      groupId: group.id,
      groupName: group.name,
      autoCounter: Boolean(counter && group.autoRoute && (!group.routeRevision || counter.revision === group.routeRevision)),
      estimatedMembers: counter ? counter.baselineMembers + counter.clicks : null,
      switchAt: counter ? counter.switchAt : null
    };
    window.achados3dRouting = routing;
    resolveRouting(routing);
  }

  function disableButtons() {
    buttons.forEach(function (button) {
      button.removeAttribute("href");
      button.dataset.autoCounter = "0";
      button.setAttribute("aria-disabled", "true");
      button.addEventListener("click", function (event) { event.preventDefault(); });
      var label = button.querySelector("span");
      if (label) label.textContent = "Grupos temporariamente lotados";
    });
    var routing = { groupId: "", groupName: "", autoCounter: false, available: false };
    window.achados3dRouting = routing;
    resolveRouting(routing);
  }

  function keepFallback() {
    var button = buttons[0];
    var routing = {
      groupId: button && button.dataset.groupId || "grupo-1",
      groupName: "",
      autoCounter: false,
      fallback: true
    };
    window.achados3dRouting = routing;
    resolveRouting(routing);
  }

  fetch(CONFIG_URL, { mode: "cors", credentials: "omit", cache: "no-store" })
    .then(function (response) {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (documentData) {
      if (!documentData) {
        keepFallback();
        return;
      }
      var fields = documentData.fields || {};
      var groups = parseGroups(fields);

      // Backwards compatibility with the original single-destination document.
      if (!groups.length) {
        var available = fields.available && fields.available.booleanValue === true;
        var legacyGroup = {
          id: stringField(fields, "groupId"),
          name: stringField(fields, "groupName"),
          url: stringField(fields, "url")
        };
        if (available && validWhatsAppLink(legacyGroup.url)) applyGroup(legacyGroup, null);
        else disableButtons();
        return;
      }

      function selectNext(index) {
        if (index >= groups.length) {
          disableButtons();
          return Promise.resolve();
        }
        var group = groups[index];
        if (group.status !== "active" || !validWhatsAppLink(group.url)) return selectNext(index + 1);
        return fetchCounter(group).then(function (counter) {
          if (isEstimatedFull(group, counter)) return selectNext(index + 1);
          applyGroup(group, counter);
        });
      }
      return selectNext(0);
    })
    .catch(keepFallback);
})();
