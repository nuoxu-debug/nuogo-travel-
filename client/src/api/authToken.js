const TOKEN_KEY = "nuogo-token";
export const AUTH_TOKEN_CHANGE_EVENT = "nuogo:auth-token-change";

function notifyTokenChange() {
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGE_EVENT));
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  notifyTokenChange();
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  notifyTokenChange();
}
