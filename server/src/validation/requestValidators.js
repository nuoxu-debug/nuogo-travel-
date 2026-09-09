import { body, checkExact } from "express-validator";

const supportedDestinations = ["singapore"];
const activityPreferences = ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"];

const requiredText = (field, min, max) => body(field).isString().trim().isLength({ min, max });
const password = () => body("password").isString().isLength({ min: 8 }).custom((value) => {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > 72) {
    throw new Error("Password must be at most 72 UTF-8 bytes.");
  }
  return true;
});

export const registrationRequest = [checkExact([
  requiredText("name", 2, 80),
  body("email").isString().trim().isEmail().normalizeEmail().isLength({ max: 160 }),
  password()
])];

export const loginRequest = [checkExact([
  body("email").isString().trim().isEmail().normalizeEmail().isLength({ max: 160 }),
  password()
])];

export const travelPreferenceRequest = [checkExact([
  body("destination").isIn(supportedDestinations),
  body("startDate").isISO8601({ strict: true, strictSeparator: true }),
  body("endDate").isISO8601({ strict: true, strictSeparator: true }).custom((value, { req }) => {
    if (value < req.body.startDate) throw new Error("End date must be on or after start date.");
    return true;
  }),
  body("travellerCount").isInt({ min: 1, max: 20 }).toInt(),
  body("budgetMinor").isInt({ min: 1000, max: 100000000 }).toInt(),
  body("currency").equals("SGD"),
  body("interests").isArray({ min: 1, max: 7 }),
  body("interests.*").isIn(activityPreferences),
  body("preferredSights").isArray({ max: 12 }),
  body("preferredSights.*").isString().trim().isLength({ min: 1, max: 120 }),
  body("attractionSelectionMode").isIn(["MANUAL", "AUTO"]),
  body("selectedAttractions").isArray({ max: 12 }),
  body("selectedAttractions.*.xid").isString().trim().isLength({ min: 1, max: 120 }),
  body("selectedAttractions.*.displayName").isString().trim().isLength({ min: 1, max: 160 }),
  body("travelStyle").isIn(["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"]),
  body("rainyDayBackupEnabled").isBoolean({ strict: true }),
  body("otherPreferences").optional({ values: "falsy" }).isString().trim().isLength({ max: 500 }),
  body("language").optional().isIn(["en", "zh"]),
  body("consentToLlmProcessing").custom((value) => value === true)
])];
