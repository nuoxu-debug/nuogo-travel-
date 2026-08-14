import { ExternalServiceError } from "../../errors.js";

export const providerErrorCodes = Object.freeze({
  unavailable: "PROVIDER_UNAVAILABLE",
  rateLimited: "PROVIDER_RATE_LIMITED",
  authFailed: "PROVIDER_AUTH_FAILED",
  routeUnavailable: "ROUTE_UNAVAILABLE"
});

export class TravelProviderError extends ExternalServiceError {
  constructor(message, { code = providerErrorCodes.unavailable, cause } = {}) {
    super(message, { code, cause });
  }
}

export function routeUnavailable(message = "No route is available for this leg.") {
  return new TravelProviderError(message, { code: providerErrorCodes.routeUnavailable });
}
