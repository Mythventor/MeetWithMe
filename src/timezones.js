import { Temporal } from '@js-temporal/polyfill';

export const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export const zoneName = (zone) => zone.replaceAll('_', ' ');
export function referenceDate(event, day, week) {
  if (event.mode !== 'days') return day;
  const date = Temporal.PlainDate.from(week);
  return date.subtract({ days: date.dayOfWeek % 7 }).add({ days: Number(day) }).toString();
}
// Keep existing event-date:quarter keys stable across every display zone.
// Reject gaps and folds rather than silently assigning an ambiguous instant.
export function slotInstant(event, day, quarter, week) {
  const date = Temporal.PlainDate.from(referenceDate(event, day, week));
  const wall = date.toPlainDateTime().add({ minutes: quarter * 15 });
  try {
    return wall.toZonedDateTime(event.zone, { disambiguation: 'reject' }).toInstant();
  } catch { return null; }
}
export function localTime(instant, zone) {
  if (!instant) return null;
  const zoned = instant.toZonedDateTimeISO(zone);
  return {
    time: zoned.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' }),
    date: zoned.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    iso: zoned.toPlainDate().toString(),
    offset: `UTC${zoned.offset}`,
    night: zoned.hour < 8 || zoned.hour >= 20,
  };
}
