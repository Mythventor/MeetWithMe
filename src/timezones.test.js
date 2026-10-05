import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slotInstant, localTime, referenceDate } from './timezones.js';
const event = { mode: 'dates', zone: 'America/New_York' };
test('converts fractional offsets and crosses midnight', () => {
  const instant = slotInstant(event, '2026-10-05', 64);
  assert.equal(localTime(instant, 'Asia/Kathmandu').time, '1:45 AM');
  assert.equal(localTime(instant, 'Asia/Kathmandu').iso, '2026-10-06');
  assert.equal(localTime(instant, 'America/Los_Angeles').time, '1:00 PM');
});
test('uses date-specific daylight saving offsets', () => {
  assert.equal(localTime(slotInstant(event, '2026-10-20', 36), 'Europe/London').time, '2:00 PM');
  assert.equal(localTime(slotInstant(event, '2026-10-28', 36), 'Europe/London').time, '1:00 PM');
});
test('rejects nonexistent and repeated event times', () => {
  assert.equal(slotInstant(event, '2026-03-08', 10), null);
  assert.equal(slotInstant(event, '2026-11-01', 6), null);
});
test('24:00 is next midnight and weekday references use Sunday start', () => {
  assert.equal(localTime(slotInstant(event, '2026-10-05', 96), event.zone).iso, '2026-10-06');
  assert.equal(referenceDate({mode:'days'}, '1', '2026-10-08'), '2026-10-05');
});
