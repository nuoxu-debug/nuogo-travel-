const normalized = (value) => value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");

export function resolveAttractionPreferences(preferences, candidatePool) {
  const candidates = candidatePool.candidates ?? [];
  const byXid = new Map(candidates.map((candidate) => [candidate.xid ?? candidate.candidateId, candidate]));
  let mode; let requested;
  if (preferences.attractionSelectionMode === "AUTO") { mode = "AUTO"; requested = []; }
  else if (preferences.attractionSelectionMode === "MANUAL") { mode = "MANUAL"; requested = preferences.selectedAttractions ?? []; }
  else if (preferences.preferredSights?.length) { mode = "LEGACY"; requested = preferences.preferredSights.map((displayName) => ({ displayName })); }
  else { mode = "AUTO"; requested = []; }

  const supported = []; const unresolved = []; const seen = new Set();
  for (const request of requested) {
    let candidate;
    if (mode === "MANUAL") candidate = byXid.get(request.xid);
    else {
      const matches = candidates.filter((item) => [item.name, item.displayName?.en, item.displayName?.zh].filter(Boolean).some((name) => normalized(name) === normalized(request.displayName)));
      if (matches.length === 1) candidate = matches[0];
      else if (matches.length > 1) { unresolved.push({ ...request, reason: "AMBIGUOUS_ATTRACTION" }); continue; }
    }
    const xid = candidate?.xid ?? candidate?.candidateId ?? request.xid;
    if (seen.has(xid)) { unresolved.push({ xid, displayName: request.displayName, reason: "DUPLICATE_SELECTION" }); continue; }
    seen.add(xid);
    if (!candidate || candidate.city !== candidatePool.city) { unresolved.push({ ...(request.xid ? { xid: request.xid } : {}), displayName: request.displayName, reason: mode === "MANUAL" ? "UNAVAILABLE_ATTRACTION" : "UNMATCHED_ATTRACTION" }); continue; }
    supported.push(candidate);
  }
  return { mode, requested, supported, unresolved };
}
