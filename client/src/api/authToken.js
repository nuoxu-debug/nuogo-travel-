const TOKEN_KEY = "nuogo-token";
export const AUTH_TOKEN_CHANGE_EVENT = "nuogo:auth-token-change";

function notifyTokenChange(reason) {
  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_CHANGE_EVENT, { detail: { reason } }));
}

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token, { guest = false } = {}) {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  (guest ? sessionStorage : localStorage).setItem(TOKEN_KEY, token);
  notifyTokenChange();
}

export function clearAuthToken(reason) {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("nuogo-") && key !== "nuogo-language" && key !== "nuogo-language-default") {
      localStorage.removeItem(key);
    }
  }
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith("nuogo-")) {
      sessionStorage.removeItem(key);
    }
  }
  notifyTokenChange(reason);
}
