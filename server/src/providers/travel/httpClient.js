import { TravelProviderError, providerErrorCodes } from "./providerError.js";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function codeForStatus(status) {
  if (status === 429) return providerErrorCodes.rateLimited;
  if (status >= 400 && status < 500) return providerErrorCodes.authFailed;
  return providerErrorCodes.unavailable;
}

function isTransientStatus(status) {
  return status === 408 || status === 425 || status >= 500;
}

export async function requestJson(url, {
  fetchImpl = fetch,
  signal,
  timeoutMs = 8000,
  retries = 2,
  retryDelayMs = 100,
  AbortControllerImpl = AbortController,
  schema
} = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortControllerImpl();
    const forwardAbort = () => controller.abort(signal.reason);
    signal?.addEventListener("abort", forwardAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(new Error("Provider request timed out.")), timeoutMs);

    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      if (!response.ok) {
        if (attempt < retries && isTransientStatus(response.status)) {
          await wait(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new TravelProviderError(`Travel provider returned HTTP ${response.status}.`, {
          code: codeForStatus(response.status)
        });
      }

      let body;
      try {
        body = await response.json();
      } catch (cause) {
        throw new TravelProviderError("Travel provider returned invalid JSON.", { cause });
      }
      const parsed = schema?.safeParse(body);
      if (parsed && !parsed.success) {
        throw new TravelProviderError("Travel provider returned a malformed payload.", {
          cause: parsed.error
        });
      }
      return parsed ? parsed.data : body;
    } catch (cause) {
      if (cause instanceof TravelProviderError) throw cause;
      if (attempt < retries && !signal?.aborted) {
        await wait(retryDelayMs * (attempt + 1));
        continue;
      }
      throw new TravelProviderError("Travel provider request failed.", { cause });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", forwardAbort);
    }
  }

  throw new TravelProviderError("Travel provider request failed.");
}
