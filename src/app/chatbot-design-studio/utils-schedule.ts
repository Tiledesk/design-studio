/** Schedule and payload helpers of the Scheduled start point. Validation and wording mirror the server (scheduledStartRules.js). */

export type ScheduleFrequency = 'interval' | 'daily' | 'weekly' | 'monthly';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Schedule {
  frequency: ScheduleFrequency;
  every?: number;
  unit?: 'minutes' | 'hours';
  time?: string;
  weekdays?: Weekday[];
  day_of_month?: number | 'last';
  timezone: string;
}

export interface PayloadRow {
  name: string;
  type: 'text' | 'number' | 'boolean';
  /** text: string; number: the typed string (e.g. "08"); boolean: true/false */
  value: any;
}

export type ScheduledStatus = 'live' | 'changes' | 'not_live' | 'error';

const FREQUENCIES = ['interval', 'daily', 'weekly', 'monthly'];
const MINUTE_STEPS = [5, 10, 15, 20, 30];
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];
const MAX_PAYLOAD_KEYS = 50;

export function defaultSchedule(timezone: string): Schedule {
  return { frequency: 'daily', time: '09:00', timezone };
}

function sortedWeekdays(weekdays: string[]): string[] {
  return WEEKDAYS.filter(d => (weekdays || []).includes(d));
}

function validTimezone(tz: any): boolean {
  if (typeof tz !== 'string' || !tz) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

/** Same sentences as the server's `summarize`; meant for a valid schedule */
export function describeSchedule(schedule: Schedule): string {
  const tz = ' (' + schedule.timezone + ')';
  if (schedule.frequency === 'interval') {
    if (schedule.every === 1 && schedule.unit === 'hours') {
      return 'Every hour' + tz;
    }
    return 'Every ' + schedule.every + ' ' + schedule.unit + tz;
  }
  const at = ' at ' + schedule.time + tz;
  if (schedule.frequency === 'daily') {
    return 'Daily' + at;
  }
  if (schedule.frequency === 'weekly') {
    const days = sortedWeekdays(schedule.weekdays);
    if (days.join(',') === 'mon,tue,wed,thu,fri') {
      return 'Every weekday' + at;
    }
    return 'Every ' + days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') + at;
  }
  return 'Monthly on ' + (schedule.day_of_month === 'last' ? 'the last day' : 'day ' + schedule.day_of_month) + at;
}

/** An error message naming the field, or null when the schedule is valid (same rules as the server) */
export function scheduleError(schedule: any): string | null {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return 'schedule must be an object';
  }
  if (!FREQUENCIES.includes(schedule.frequency)) {
    return 'schedule.frequency must be one of ' + FREQUENCIES.join(', ');
  }
  if (schedule.frequency === 'interval') {
    if (schedule.unit === 'minutes') {
      if (!MINUTE_STEPS.includes(schedule.every)) {
        return 'schedule.every must be one of ' + MINUTE_STEPS.join(', ') + ' when unit is minutes';
      }
    } else if (schedule.unit === 'hours') {
      if (!Number.isInteger(schedule.every) || schedule.every < 1 || schedule.every > 12) {
        return 'schedule.every must be an integer between 1 and 12 when unit is hours';
      }
    } else {
      return 'schedule.unit must be minutes or hours';
    }
  } else {
    if (typeof schedule.time !== 'string' || !TIME_REGEX.test(schedule.time)) {
      return 'schedule.time must be in the format HH:MM';
    }
    if (schedule.frequency === 'weekly') {
      if (!Array.isArray(schedule.weekdays) || schedule.weekdays.length < 1 ||
          !schedule.weekdays.every(d => WEEKDAYS.includes(d))) {
        return 'schedule.weekdays must contain at least one of ' + WEEKDAYS.join(', ');
      }
    }
    if (schedule.frequency === 'monthly') {
      const d = schedule.day_of_month;
      if (d !== 'last' && !(Number.isInteger(d) && d >= 1 && d <= 28)) {
        return "schedule.day_of_month must be an integer between 1 and 28 or 'last'";
      }
    }
  }
  if (!validTimezone(schedule.timezone)) {
    return 'schedule.timezone must be a valid IANA time zone';
  }
  return null;
}

/** Keeps only the fields the frequency uses: a stale `weekdays` never reaches the server from a Daily schedule */
export function cleanSchedule(schedule: Schedule): Schedule {
  const s: any = schedule || {};
  const out: any = { frequency: s.frequency };
  if (s.frequency === 'interval') {
    out.every = s.every;
    out.unit = s.unit;
  } else {
    out.time = s.time;
    if (s.frequency === 'weekly') {
      out.weekdays = Array.isArray(s.weekdays) ? sortedWeekdays(s.weekdays) : s.weekdays;
    } else if (s.frequency === 'monthly') {
      out.day_of_month = s.day_of_month;
    }
  }
  out.timezone = s.timezone;
  return out;
}

/** Rows of the payload editor, in the payload's key order */
export function payloadToRows(payload: any): PayloadRow[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }
  return Object.keys(payload).map(name => {
    const v = payload[name];
    if (typeof v === 'number') {
      return { name, type: 'number' as const, value: String(v) };
    }
    if (typeof v === 'boolean') {
      return { name, type: 'boolean' as const, value: v };
    }
    return { name, type: 'text' as const, value: v === undefined || v === null ? '' : String(v) };
  });
}

/** The payload object of the rows, or the first error. Numbers become numbers ("08" -> 8), booleans booleans */
export function rowsToPayload(rows: PayloadRow[]): { payload: { [key: string]: string | number | boolean }, error: string | null } {
  const payload: { [key: string]: string | number | boolean } = {};
  const list = rows || [];
  if (list.length > MAX_PAYLOAD_KEYS) {
    return { payload: {}, error: 'At most ' + MAX_PAYLOAD_KEYS + ' fields' };
  }
  const seen = new Set<string>();
  for (const row of list) {
    const name = row?.name;
    if (FORBIDDEN_KEYS.includes(name)) {
      return { payload: {}, error: 'Field name ' + name + ' is not allowed' };
    }
    if (typeof name !== 'string' || !KEY_REGEX.test(name)) {
      return { payload: {}, error: 'Field name ' + (name || '') + ' is invalid: use letters, digits and underscore, not starting with a digit' };
    }
    if (seen.has(name)) {
      return { payload: {}, error: 'Field name ' + name + ' is duplicated' };
    }
    seen.add(name);
    if (row.type === 'number') {
      const raw = typeof row.value === 'number' ? String(row.value) : String(row.value ?? '').trim();
      const n = raw === '' ? NaN : Number(raw);
      if (!Number.isFinite(n)) {
        return { payload: {}, error: 'Field ' + name + ' must be a number' };
      }
      payload[name] = n;
    } else if (row.type === 'boolean') {
      payload[name] = row.value === true || row.value === 'true';
    } else {
      payload[name] = row.value === undefined || row.value === null ? '' : String(row.value);
    }
  }
  return { payload, error: null };
}

function canonical(value: any): string {
  if (Array.isArray(value)) {
    return '[' + value.map(canonical).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort()
      .map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value === undefined ? null : value);
}

function comparable(sp: any): string {
  return canonical({
    enabled: sp?.enabled !== false,
    block_id: sp?.block_id,
    source_name: sp?.mapping?.source_name || '',
    payload: sp?.mapping?.payload || {},
    schedule: cleanSchedule(sp?.schedule)
  });
}

/**
 * Draft vs what the scheduler runs. `live` may be `{ error }` only (error whenever set) or absent (not live).
 * Payload is compared key-order-insensitively; schedule through cleanSchedule.
 */
export function scheduledStatus(startPoint: any, live: any): ScheduledStatus {
  if (live?.error) {
    return 'error';
  }
  if (!live) {
    return 'not_live';
  }
  return comparable(startPoint) === comparable(live) ? 'live' : 'changes';
}
