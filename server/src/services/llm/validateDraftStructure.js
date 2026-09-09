import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { itineraryDraftJsonSchema } from "@nuogo/shared/itinerary-draft-schema";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(itineraryDraftJsonSchema);

export function validateDraftStructure(value) {
  const valid = validate(value);
  return {
    valid,
    errors: valid ? [] : structuredClone(validate.errors ?? [])
  };
}
