export class AppError extends Error {
  constructor(message, { code = "INTERNAL_ERROR", status = 500, cause } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
  }
}

export class ExternalServiceError extends AppError {
  constructor(message, { code = "EXTERNAL_SERVICE_ERROR", cause } = {}) {
    super(message, { code, status: 502, cause });
  }
}

export class ExternalServiceTimeoutError extends AppError {
  constructor(message, { code = "EXTERNAL_SERVICE_TIMEOUT", cause } = {}) {
    super(message, { code, status: 504, cause });
  }
}
