import { defaultSchedule, describeSchedule, scheduleError, cleanSchedule, payloadToRows, rowsToPayload, scheduledStatus } from './utils-schedule';

describe('utils-schedule', () => {
  const daily: any = { frequency: 'daily', time: '09:00', timezone: 'UTC' };

  it('defaultSchedule is daily 09:00 in the given timezone', () => {
    expect(defaultSchedule('Europe/Rome')).toEqual({ frequency: 'daily', time: '09:00', timezone: 'Europe/Rome' });
  });

  describe('describeSchedule', () => {
    it('matches the server summaries', () => {
      expect(describeSchedule({ frequency: 'weekly', time: '08:30', weekdays: ['fri', 'mon', 'tue', 'wed', 'thu'], timezone: 'Europe/Rome' })).toBe('Every weekday at 08:30 (Europe/Rome)');
      expect(describeSchedule({ frequency: 'interval', every: 15, unit: 'minutes', timezone: 'UTC' })).toBe('Every 15 minutes (UTC)');
      expect(describeSchedule({ frequency: 'interval', every: 1, unit: 'hours', timezone: 'UTC' })).toBe('Every hour (UTC)');
      expect(describeSchedule({ frequency: 'interval', every: 2, unit: 'hours', timezone: 'UTC' })).toBe('Every 2 hours (UTC)');
      expect(describeSchedule(daily)).toBe('Daily at 09:00 (UTC)');
      expect(describeSchedule({ frequency: 'weekly', time: '10:00', weekdays: ['sun', 'mon'], timezone: 'UTC' })).toBe('Every Mon, Sun at 10:00 (UTC)');
      expect(describeSchedule({ frequency: 'monthly', time: '07:00', day_of_month: 'last', timezone: 'UTC' })).toBe('Monthly on the last day at 07:00 (UTC)');
      expect(describeSchedule({ frequency: 'monthly', time: '07:00', day_of_month: 5, timezone: 'UTC' })).toBe('Monthly on day 5 at 07:00 (UTC)');
    });
  });

  describe('scheduleError', () => {
    it('null for valid schedules', () => {
      expect(scheduleError(daily)).toBeNull();
      expect(scheduleError({ frequency: 'interval', every: 30, unit: 'minutes', timezone: 'UTC' })).toBeNull();
      expect(scheduleError({ frequency: 'interval', every: 12, unit: 'hours', timezone: 'UTC' })).toBeNull();
      expect(scheduleError({ frequency: 'monthly', time: '00:00', day_of_month: 28, timezone: 'UTC' })).toBeNull();
    });
    it('reports each invalid case', () => {
      expect(scheduleError(null)).toBeTruthy();
      expect(scheduleError({ ...daily, frequency: 'yearly' })).toBeTruthy();
      expect(scheduleError({ frequency: 'interval', every: 7, unit: 'minutes', timezone: 'UTC' })).toBeTruthy();
      expect(scheduleError({ frequency: 'interval', every: 13, unit: 'hours', timezone: 'UTC' })).toBeTruthy();
      expect(scheduleError({ frequency: 'interval', every: 0, unit: 'hours', timezone: 'UTC' })).toBeTruthy();
      expect(scheduleError({ frequency: 'interval', every: 5, unit: 'days', timezone: 'UTC' })).toBeTruthy();
      expect(scheduleError({ ...daily, time: '24:00' })).toBeTruthy();
      expect(scheduleError({ ...daily, time: '9:00' })).toBeTruthy();
      expect(scheduleError({ ...daily, time: undefined })).toBeTruthy();
      expect(scheduleError({ frequency: 'weekly', time: '09:00', weekdays: [], timezone: 'UTC' })).toBeTruthy();
      expect(scheduleError({ frequency: 'weekly', time: '09:00', weekdays: ['xyz'], timezone: 'UTC' })).toBeTruthy();
      expect(scheduleError({ frequency: 'monthly', time: '09:00', day_of_month: 29, timezone: 'UTC' })).toBeTruthy();
      expect(scheduleError({ frequency: 'monthly', time: '09:00', timezone: 'UTC' })).toBeTruthy();
      expect(scheduleError({ ...daily, timezone: '' })).toBeTruthy();
      expect(scheduleError({ ...daily, timezone: 'Not/AZone' })).toBeTruthy();
    });
  });

  describe('cleanSchedule', () => {
    it('drops weekdays from a daily schedule (stale state after Weekly -> Daily)', () => {
      const cleaned = cleanSchedule({ ...daily, weekdays: ['mon'], day_of_month: 3, every: 5, unit: 'hours' });
      expect(cleaned).toEqual(daily);
      expect('weekdays' in cleaned).toBeFalse();
    });
    it('keeps only the fields of each frequency', () => {
      expect(cleanSchedule({ frequency: 'interval', every: 5, unit: 'minutes', time: '09:00', timezone: 'UTC' })).toEqual({ frequency: 'interval', every: 5, unit: 'minutes', timezone: 'UTC' });
      expect(cleanSchedule({ frequency: 'weekly', time: '09:00', weekdays: ['mon'], day_of_month: 1, timezone: 'UTC' })).toEqual({ frequency: 'weekly', time: '09:00', weekdays: ['mon'], timezone: 'UTC' });
      expect(cleanSchedule({ frequency: 'monthly', time: '09:00', weekdays: ['mon'], day_of_month: 'last', timezone: 'UTC' })).toEqual({ frequency: 'monthly', time: '09:00', day_of_month: 'last', timezone: 'UTC' });
    });
  });

  describe('payload rows', () => {
    it('payloadToRows keeps order and infers the type', () => {
      const rows = payloadToRows({ b: 'x', a: 8, c: true });
      expect(rows.map(r => r.name)).toEqual(['b', 'a', 'c']);
      expect(rows.map(r => r.type)).toEqual(['text', 'number', 'boolean']);
      expect(payloadToRows(undefined)).toEqual([]);
      expect(payloadToRows(null)).toEqual([]);
    });
    it('round trip: number "08" -> 8, boolean, same rows in same order', () => {
      const rows: any[] = [
        { name: 'check', type: 'text', value: 'hello' },
        { name: 'n', type: 'number', value: '08' },
        { name: 'flag', type: 'boolean', value: true },
      ];
      const { payload, error } = rowsToPayload(rows);
      expect(error).toBeNull();
      expect(payload).toEqual({ check: 'hello', n: 8, flag: true });
      expect(typeof payload['n']).toBe('number');
      expect(Object.keys(payload)).toEqual(['check', 'n', 'flag']);
      const back = payloadToRows(payload);
      expect(back.map(r => r.name)).toEqual(['check', 'n', 'flag']);
      expect(back.map(r => r.type)).toEqual(['text', 'number', 'boolean']);
      expect(rowsToPayload(back).payload).toEqual(payload);
    });
    it('boolean accepts the strings true/false', () => {
      expect(rowsToPayload([{ name: 'f', type: 'boolean', value: 'false' } as any]).payload).toEqual({ f: false });
    });
    it('errors: duplicate, invalid and forbidden names, bad number, too many', () => {
      expect(rowsToPayload([{ name: 'a', type: 'text', value: '1' }, { name: 'a', type: 'text', value: '2' }]).error).toBeTruthy();
      expect(rowsToPayload([{ name: '1a', type: 'text', value: '' }]).error).toBeTruthy();
      expect(rowsToPayload([{ name: 'a b', type: 'text', value: '' }]).error).toBeTruthy();
      expect(rowsToPayload([{ name: '', type: 'text', value: '' }]).error).toBeTruthy();
      expect(rowsToPayload([{ name: '__proto__', type: 'text', value: '' }]).error).toBeTruthy();
      expect(rowsToPayload([{ name: 'constructor', type: 'text', value: '' }]).error).toBeTruthy();
      expect(rowsToPayload([{ name: 'prototype', type: 'text', value: '' }]).error).toBeTruthy();
      expect(rowsToPayload([{ name: 'n', type: 'number', value: 'abc' }]).error).toBeTruthy();
      expect(rowsToPayload([{ name: 'n', type: 'number', value: '' }]).error).toBeTruthy();
      const many = Array.from({ length: 51 }, (_, i) => ({ name: 'k' + i, type: 'text' as const, value: '' }));
      expect(rowsToPayload(many).error).toBeTruthy();
      expect(rowsToPayload(many.slice(0, 50)).error).toBeNull();
    });
  });

  describe('scheduledStatus', () => {
    const sp = { enabled: true, block_id: 'b1', mapping: { source_name: 'Bot', payload: { a: 1, b: 'x' } }, schedule: daily };
    const live = JSON.parse(JSON.stringify(sp));
    it('not_live without a live schedule', () => {
      expect(scheduledStatus(sp, null)).toBe('not_live');
      expect(scheduledStatus(sp, undefined)).toBe('not_live');
    });
    it('live when equal, regardless of payload key order and stale schedule fields', () => {
      expect(scheduledStatus(sp, live)).toBe('live');
      expect(scheduledStatus(sp, { ...live, mapping: { source_name: 'Bot', payload: { b: 'x', a: 1 } } })).toBe('live');
      expect(scheduledStatus({ ...sp, schedule: { ...daily, weekdays: ['mon'] } }, live)).toBe('live');
    });
    it('missing payload equals empty payload', () => {
      expect(scheduledStatus({ ...sp, mapping: { source_name: 'Bot', payload: {} } }, { ...live, mapping: { source_name: 'Bot' } })).toBe('live');
    });
    it('changes when anything differs', () => {
      expect(scheduledStatus({ ...sp, enabled: false }, live)).toBe('changes');
      expect(scheduledStatus({ ...sp, block_id: 'b2' }, live)).toBe('changes');
      expect(scheduledStatus({ ...sp, mapping: { source_name: 'Other', payload: sp.mapping.payload } }, live)).toBe('changes');
      expect(scheduledStatus({ ...sp, mapping: { source_name: 'Bot', payload: { a: 2, b: 'x' } } }, live)).toBe('changes');
      expect(scheduledStatus({ ...sp, schedule: { ...daily, time: '10:00' } }, live)).toBe('changes');
    });
    it('error whenever live.error is set (live may be {error} only)', () => {
      expect(scheduledStatus(sp, { error: 'x' })).toBe('error');
      expect(scheduledStatus(sp, { ...live, error: 'x' })).toBe('error');
    });
  });
});
