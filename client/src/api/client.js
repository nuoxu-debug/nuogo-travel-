import { clearAuthToken, getAuthToken } from "./authToken.js";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearAuthToken();
    const error = new Error(body.error?.message || "Nuogo could not complete this request.");
    error.code = body.error?.code || "REQUEST_FAILED";
    error.status = response.status;
    error.details = body.error?.details;
    throw error;
  }
  return body;
}
