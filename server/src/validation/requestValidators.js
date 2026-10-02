import { body, checkExact } from "express-validator";

const supportedDestinations = ["singapore"];
const activityPreferences = ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"];
const transportPreferenceModes = ["MANUAL", "AUTO_CHEAPEST"];
const preferredTransportModes = ["PUBLIC_TRANSIT", "WALK", "TAXI"];
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
  requiredText("departurePoint", 1, 160),
  requiredText("arrivalPoint", 1, 160),
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
  body("dailyAttractionTarget").optional().isInt({ min: 1, max: 12 }).toInt(),
  body("preferredSights").isArray({ max: 12 }),
  body("preferredSights.*").isString().trim().isLength({ min: 1, max: 120 }),
  body("transportPreferenceMode").optional().isIn(transportPreferenceModes),
  body("preferredTransportModes").optional().isArray({ max: 3 }).custom((value, { req }) => {
    if (req.body.transportPreferenceMode === "MANUAL" && (!Array.isArray(value) || value.length === 0)) {
      throw new Error("Manual transport preference requires at least one transport mode.");
    }
    if (Array.isArray(value) && new Set(value).size !== value.length) {
      throw new Error("Preferred transport modes must be unique.");
    }
    return true;
  }),
  body("preferredTransportModes.*").optional().isIn(preferredTransportModes),
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
