import { selectedAttractionOutcomeSchema } from "@nuogo/shared/schemas";

const reasons = Object.freeze({
  UNAVAILABLE_ATTRACTION: { en: "was not included because its supported attraction record is currently unavailable.", zh: "未加入本次行程，因为当前无法取得受支持的景点资料。" },
  UNMATCHED_ATTRACTION: { en: "was not included because it could not be matched to supported attraction data.", zh: "未加入本次行程，因为无法与受支持的景点资料准确匹配。" },
  AMBIGUOUS_ATTRACTION: { en: "was not included because the requested name matched more than one supported attraction.", zh: "未加入本次行程，因为该名称对应多个景点，暂时无法准确确认。" },
  WRONG_CITY: { en: "was not included because it is outside the selected destination.", zh: "未加入本次行程，因为该景点不在所选目的地内。" },
  INVALID_GROUNDING: { en: "was not included because its attraction identity could not be validated.", zh: "未加入本次行程，因为无法验证该景点的身份资料。" },
  DUPLICATE_SELECTION: { en: "was not included again because the same attraction was already selected.", zh: "未重复加入，因为相同景点已经在选择中。" },
  SCHEDULE_FEASIBILITY: { en: "was not included because it could not fit the available schedule without creating an unrealistic day.", zh: "未加入本次行程，因为在现有时间内加入会造成不合理的每日安排。" },
  BUDGET_FEASIBILITY: { en: "was not included because adding it would exceed the total trip budget.", zh: "未加入本次行程，因为加入后会超出本次旅行的总预算。" },
  ROUTE_FEASIBILITY: { en: "was not included because adding it would create excessive travel or backtracking.", zh: "未加入本次行程，因为加入后会造成过度赶路或明显折返。" },
  DENSITY_FEASIBILITY: { en: "was not included because adding it would make the day unreasonably crowded.", zh: "未加入本次行程，因为加入后会使当天行程过于拥挤。" },
  CONTINUITY_FEASIBILITY: { en: "was not included because it could not connect reasonably with the surrounding itinerary.", zh: "未加入本次行程，因为无法与前后行程合理衔接。" },
  COMBINED_FEASIBILITY: { en: "was not included because it could not be added while keeping the complete itinerary practical and within budget.", zh: "未加入本次行程，因为无法在兼顾完整行程可行性与总预算的情况下合理加入。" }
});

const structuralCodes = new Set(["UNAVAILABLE_ATTRACTION", "UNMATCHED_ATTRACTION", "AMBIGUOUS_ATTRACTION", "WRONG_CITY", "INVALID_GROUNDING", "DUPLICATE_SELECTION"]);

function localizedRecord(record, index) {
  const displayName = typeof record.displayName === "string" ? { en: record.displayName, zh: record.displayName } : record.displayName;
  return { requestId: record.requestId ?? `${record.xid ? "structured" : "legacy"}:${record.xid ?? index}`, ...(record.xid ? { xid: record.xid } : {}), displayName };
}

export function buildSelectedAttractionOutcome({ requested, itinerary, structurallyExcluded = [], finalEvaluationRejected = [] }) {
  const records = requested.map(localizedRecord);
  const includedXids = new Set((itinerary.days ?? []).flatMap((day) => day.activities ?? []).map(({ xid }) => xid).filter(Boolean));
  const structural = new Map(structurallyExcluded.map((item) => [item.requestId ?? records.find(({ xid }) => xid === item.xid)?.requestId, item.reasonCode ?? item.reason]));
  const rejected = new Map(finalEvaluationRejected.map((item) => [item.requestId, item.reasonCode]));
  const included = []; const excluded = [];
  for (const record of records) {
    if (record.xid && includedXids.has(record.xid)) { included.push(record); continue; }
    const reasonCode = structural.get(record.requestId) ?? rejected.get(record.requestId);
    if (!reasonCode || !reasons[reasonCode] || (structural.has(record.requestId) && !structuralCodes.has(reasonCode))) throw new TypeError(`Selected attraction ${record.requestId} has no complete final outcome evidence.`);
    const name = record.displayName;
    excluded.push({ ...record, reasonCode, reason: { en: `${name.en} ${reasons[reasonCode].en}`, zh: `${name.zh}${reasons[reasonCode].zh}` } });
  }
  return selectedAttractionOutcomeSchema.parse({ requested: records, included, excluded });
}
