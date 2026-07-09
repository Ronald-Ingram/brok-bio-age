import { DISCLAIMER_COOKIE, DISCLAIMER_KEY } from "@/lib/disclaimer";

/**
 * Runs before / without React. Handles accept + reveal on load.
 * Script is at top of body, so reveal waits for DOMContentLoaded.
 */
export function DisclaimerFallbackScript() {
  const script = `
(function () {
  var KEY = ${JSON.stringify(DISCLAIMER_KEY)};
  var COOKIE = ${JSON.stringify(DISCLAIMER_COOKIE)};
  var MAIN_ID = "brok-app-main";

  function accepted() {
    try {
      if (localStorage.getItem(KEY) === "1") return true;
    } catch (e) {}
    return document.cookie.split(";").some(function (part) {
      var bits = part.trim().split("=");
      return bits[0] === COOKIE && bits[1] === "1";
    });
  }

  function markAccepted() {
    try {
      localStorage.setItem(KEY, "1");
    } catch (e) {}
    document.cookie = COOKIE + "=1; path=/; max-age=31536000; SameSite=Lax";
  }

  function revealApp() {
    var main = document.getElementById(MAIN_ID);
    if (main) main.removeAttribute("hidden");
    var overlay = document.querySelector("[data-disclaimer-overlay]");
    if (overlay) overlay.style.display = "none";
  }

  function onReady() {
    if (accepted()) revealApp();
  }

  function onAcceptClick(event) {
    var btn =
      event.target &&
      event.target.closest &&
      event.target.closest("[data-disclaimer-accept]");
    if (!btn || btn.getAttribute("aria-busy") === "true") return;
    event.preventDefault();
    btn.setAttribute("aria-busy", "true");
    btn.textContent = "Loading…";
    markAccepted();
    window.location.reload();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }

  document.addEventListener("click", onAcceptClick, true);
})();
`;

  return (
    <script
      id="brok-disclaimer-fallback"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}