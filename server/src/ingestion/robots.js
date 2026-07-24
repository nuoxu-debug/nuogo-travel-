function cleanLine(line) {
  return line.replace(/#.*$/, "").trim();
}

function wildcardRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}`);
}

export function parseRobots(text, userAgent) {
  const groups = [];
  let agents = [];
  let rules = [];

  function flush() {
    if (agents.length) groups.push({ agents, rules });
    agents = [];
    rules = [];
  }

  for (const sourceLine of text.split(/\r?\n/)) {
    const line = cleanLine(sourceLine);
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (rules.length) flush();
      agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && agents.length && value) {
      rules.push({ type: field, pattern: value });
    }
  }
  flush();

  const agent = userAgent.toLowerCase();
  const specific = groups.filter((group) => group.agents.some((entry) => agent.includes(entry)));
  const selected = specific.length
    ? specific
    : groups.filter((group) => group.agents.includes("*"));
  return selected.flatMap((group) => group.rules);
}

export function isPathAllowed(rules, pathWithQuery) {
  const matches = rules
    .filter((rule) => wildcardRegex(rule.pattern).test(pathWithQuery))
    .sort((left, right) => right.pattern.length - left.pattern.length);
  return matches[0]?.type !== "disallow";
}
