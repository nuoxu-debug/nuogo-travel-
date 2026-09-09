const secretKey = /(authorization|cookie|password|secret|token|api.?key)/i;
const secretValue = /(bearer\s+\S+|(?:api.?key|password|secret|token)\s*[:=]\s*\S+)/i;

export function redactMetadata(value, key = "") {
  if (secretKey.test(key)) return "[REDACTED]";
  if (typeof value === "string" && secretValue.test(value)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redactMetadata(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => (
      [childKey, redactMetadata(childValue, childKey)]
    )));
  }
  return value;
}

export function createLogger({ sink = (record) => console.log(JSON.stringify(record)) } = {}) {
  const write = (level, event, metadata = {}) => sink({
    level,
    event,
    metadata: redactMetadata(metadata)
  });
  return {
    info: (event, metadata) => write("info", event, metadata),
    warn: (event, metadata) => write("warn", event, metadata),
    error: (event, metadata) => write("error", event, metadata)
  };
}

export function createRepositoryLogSink({
  repository,
  consoleSink = (record) => console.log(JSON.stringify(record))
}) {
  return async (record) => {
    consoleSink(record);
    try {
      await repository.appendSystemRecord(record);
    } catch (error) {
      console.error("Nuogo could not persist a system record.", error?.message || error);
    }
  };
}
