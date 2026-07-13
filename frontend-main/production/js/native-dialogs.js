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
