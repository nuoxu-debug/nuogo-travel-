const KEY = "nuogo-attraction-draft";

export function readAttractionDraft() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY));
    if (!["MANUAL", "AUTO"].includes(value?.mode) || !Array.isArray(value.selectedAttractions)) return null;
    return {
      destination: value.destination,
      mode: value.mode,
      selectedAttractions: value.selectedAttractions
        .filter(({ xid, displayName }) => typeof xid === "string" && typeof displayName === "string")
        .map(({ xid, displayName }) => ({ xid, displayName }))
    };
  } catch { return null; }
}

export function writeAttractionDraft({ destination, mode, selectedAttractions }) {
  const value = {
    destination,
    mode,
    selectedAttractions: selectedAttractions.map(({ xid, displayName }) => ({ xid, displayName }))
  };
  sessionStorage.setItem(KEY, JSON.stringify(value));
  return value;
}

export function clearAttractionDraft() { sessionStorage.removeItem(KEY); }
