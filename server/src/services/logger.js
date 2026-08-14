const secretKey = /(authorization|cookie|password|secret|token|api.?key)/i;
const secretValue = /(bearer\s+\S+|(?:api.?key|password|secret|token)\s*[:=]\s*\S+)/i;

function redact(value, key = "") {
  if (secretKey.test(key)) return "[REDACTED]";
  if (typeof value === "string" && secretValue.test(value)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => (
      [childKey, redact(childValue, childKey)]
    )));
  }
  return value;
}

export function createLogger({ sink = (record) => console.log(JSON.stringify(record)) } = {}) {
  const write = (level, event, metadata = {}) => sink({
    level,
    event,
    metadata: redact(metadata)
  });
  return {
    info: (event, metadata) => write("info", event, metadata),
    warn: (event, metadata) => write("warn", event, metadata),
    error: (event, metadata) => write("error", event, metadata)
  };
}
