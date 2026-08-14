function toMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function propagateSchedule(day, { dayStartTime = "08:00" } = {}) {
  if (day.legs?.length !== day.activities.length + 1) return { ...day };
  let cursor = toMinutes(dayStartTime);
  const activities = day.activities.map((activity, index) => {
    const earliestStart = cursor + day.legs[index].durationMinutes;
    const plannedStart = toMinutes(activity.plannedStartTime);
    const scheduledStart = Math.max(plannedStart, earliestStart);
    const scheduledEnd = scheduledStart + activity.plannedDurationMinutes;
    cursor = scheduledEnd;
    return {
      ...activity,
      scheduledStartTime: toTime(scheduledStart),
      scheduledEndTime: toTime(scheduledEnd),
      scheduleShiftMinutes: scheduledStart - plannedStart
    };
  });
  return {
    ...day,
    activities,
    startTime: dayStartTime,
    endTime: toTime(cursor + day.legs.at(-1).durationMinutes)
  };
}
