(function restoreBrowserDialogs() {
  "use strict";

  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  const nativePrompt = window.prompt.bind(window);

  function restore() {
    window.alert = nativeAlert;
    window.confirm = nativeConfirm;
    window.prompt = nativePrompt;
  }

  restore();
  document.addEventListener("DOMContentLoaded", restore, { once: true });
  window.addEventListener("load", restore, { once: true });
})();

(function installApiResponseHelpers() {
  "use strict";

  const defaultListKeys = [
    "data",
    "items",
    "results",
    "rows",
    "records",
    "agents",
    "bookings",
    "charges",
    "cities",
    "countries",
    "excursions",
    "hotels",
    "markups",
    "promotions",
    "quotations",
    "specialPromos",
    "suppliers",
    "tours",
    "transfers",
    "users",
  ];

  function list(value, keys) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];

    const listKeys = Array.isArray(keys) && keys.length ? keys : defaultListKeys;
    for (const key of listKeys) {
      if (Array.isArray(value[key])) return value[key];
    }

    if (value.data && typeof value.data === "object") {
      for (const key of listKeys) {
        if (Array.isArray(value.data[key])) return value.data[key];
      }
    }

    return [];
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function errorMessage(error, fallback) {
    if (!error) return fallback || "Request failed.";
    if (typeof error === "string") return error || fallback || "Request failed.";
    return error.message || fallback || "Request failed.";
  }

  window.ApiResponse = Object.assign({}, window.ApiResponse || {}, {
    list,
    object,
    errorMessage,
  });
})();
