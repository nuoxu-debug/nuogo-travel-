function minutes(value) {
  if (!value) return undefined;
  const [hours, mins] = String(value).slice(0, 5).split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(mins)) return undefined;
  return hours * 60 + mins;
}

function dayOfWeek(date) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getUTCDay();
}

function active(records) {
  return records.filter(({ status, verificationStatus }) =>
    status === "ACTIVE" && verificationStatus === "VERIFIED");
}

function stateFrom(records, scheduledStartTime, scheduledEndTime, source) {
  if (!records.length) return { state: "UNVERIFIED", source };
  const usable = active(records);
  if (!usable.length) return { state: "UNVERIFIED", source };
  if (usable.some(({ isClosed }) => isClosed)) return { state: "VERIFIED_CLOSED", source, record: usable.find(({ isClosed }) => isClosed) };

  const start = minutes(scheduledStartTime);
  const end = minutes(scheduledEndTime);
  if (start === undefined || end === undefined || end <= start) return { state: "UNVERIFIED", source };
  const matching = usable.find((record) => {
    const opens = minutes(record.opensAt);
    const closes = minutes(record.closesAt);
    return opens !== undefined && closes !== undefined && opens <= start && end <= closes;
  });
  if (matching) return { state: "VERIFIED_OPEN", source, record: matching };
  return { state: "VERIFIED_CLOSED", source, record: usable[0] };
}

export function resolveOperatingHours({
  poiId,
  date,
  scheduledStartTime,
  scheduledEndTime,
  weeklyHours = [],
  exceptions = []
}) {
  const exceptionRecords = exceptions.filter((record) => record.poiId === poiId && record.exceptionDate === date);
  if (exceptionRecords.length) {
    return stateFrom(exceptionRecords, scheduledStartTime, scheduledEndTime, "EXCEPTION");
  }

  const weekday = dayOfWeek(date);
  if (weekday === undefined) return { state: "UNVERIFIED", source: "WEEKLY" };
  const weeklyRecords = weeklyHours.filter((record) => record.poiId === poiId && record.dayOfWeek === weekday);
  return stateFrom(weeklyRecords, scheduledStartTime, scheduledEndTime, "WEEKLY");
}

export function resolveActivityOperatingHours({ activity, day, candidatePool }) {
  const candidate = (candidatePool.candidates ?? []).find(({ xid, candidateId }) =>
    xid === activity.xid || candidateId === activity.xid);
  const poiId = activity.poi?.canonicalPoiId ?? candidate?.canonicalPoiId ?? activity.xid;
  return resolveOperatingHours({
    poiId,
    date: day.date,
    scheduledStartTime: activity.scheduledStartTime,
    scheduledEndTime: activity.scheduledEndTime,
    weeklyHours: candidatePool.operatingHours?.weeklyHours ?? [],
    exceptions: candidatePool.operatingHours?.exceptions ?? []
  });
}
