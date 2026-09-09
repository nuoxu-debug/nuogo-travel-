import { matchedData, validationResult } from "express-validator";

export function validateRequest(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const error = new Error("The submitted data is invalid.");
    error.code = "VALIDATION_ERROR";
    error.status = 400;
    error.details = result.array({ onlyFirstError: true }).map((issue) => ({
      field: issue.path || "request",
      message: issue.msg
    }));
    return next(error);
  }
  req.body = matchedData(req, { locations: ["body"], includeOptionals: true });
  return next();
}
