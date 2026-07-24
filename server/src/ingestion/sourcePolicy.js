const ALLOWED_HOST = "m.mafengwo.cn";
const ALLOWED_PATH = "/gl/catalog/index";

export function validateSourceUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    const error = new Error(`Source host is not allowed: ${url.hostname}`);
    error.code = "SOURCE_HOST_NOT_ALLOWED";
    throw error;
  }
  if (url.pathname !== ALLOWED_PATH) {
    const error = new Error(`Source path is not allowed: ${url.pathname}`);
    error.code = "SOURCE_PATH_NOT_ALLOWED";
    throw error;
  }
  return url;
}
