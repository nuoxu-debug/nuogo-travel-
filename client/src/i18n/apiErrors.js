const authErrorKeys = {
  INVALID_CREDENTIALS: "invalidCredentialsError",
  EMAIL_EXISTS: "emailExistsError",
  UNAUTHORIZED: "sessionExpiredError",
  VALIDATION_ERROR: "invalidSubmissionError",
  NOT_FOUND: "serviceUnavailableError"
};

export function localizeAuthError(error, t) {
  const key = authErrorKeys[error?.code]
    ?? (Number(error?.status) >= 500 ? "serverError" : "requestError");
  return t(`auth.${key}`);
}
