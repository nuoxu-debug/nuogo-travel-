const injectionPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /show\s+(me\s+)?(your\s+)?hidden\s+instructions/i,
  /act\s+as\s+(the\s+)?system/i,
  /developer\s+message/i
];

function collectStrings(value, path = "", found = []) {
  if (typeof value === "string") {
    if (injectionPatterns.some((pattern) => pattern.test(value))) found.push(path);
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, found));
    return found;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => (
      collectStrings(item, path ? `${path}.${key}` : key, found)
    ));
  }
  return found;
}

export function screenPromptInput(preferences) {
  const fields = collectStrings(preferences);
  return {
    safe: fields.length === 0,
    code: fields.length ? "PROMPT_INJECTION_SUSPECTED" : null,
    fields
  };
}
