import { Observable } from 'rxjs';
import { findStartPoint } from './utils-start-points';
import {
  Schedule, PayloadRow, ScheduledStatus, WEEKDAYS, Weekday,
  cleanSchedule, defaultSchedule, describeSchedule, payloadToRows, rowsToPayload, scheduleError, scheduledStatus
} from './utils-schedule';

/** Quiet period after the last edit before the draft is saved */
export const SCHEDULED_SAVE_DEBOUNCE_MS = 600;
/** The server answers 503 with this message when DolphinScheduler is not configured */
export const SCHEDULED_UNAVAILABLE_MESSAGE = 'Scheduled starts are not available on this installation';

export type ScheduledRepeat = 'interval_minutes' | 'interval_hours' | 'daily' | 'weekly' | 'monthly';
export const MINUTE_STEPS = [5, 10, 15, 20, 30];
export const HOUR_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const DAYS_OF_MONTH: (number | 'last')[] = [...Array.from({ length: 28 }, (_, i) => i + 1), 'last'];

const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * A next run formatted in the schedule's timezone. The scheduler preview gives wall-clock strings
 * ("2026-10-06 08:30:00", already in the schedule's timezone): shown as they are; anything else is an
 * instant (ISO with offset / Z) converted with Intl in the timezone.
 */
export function formatNextRun(run: any, timezone: string, locale?: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false };
  const text = typeof run === 'string' ? run.trim() : run;
  const wall = typeof text === 'string' ? WALL_TIME.exec(text) : null;
  try {
    if (wall) {
      const date = new Date(Date.UTC(+wall[1], +wall[2] - 1, +wall[3], +wall[4], +wall[5]));
      return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date);
    }
    const date = new Date(text);
    if (isNaN(date.getTime())) {
      return String(run);
    }
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone }).format(date);
  } catch (e) {
    return String(run);
  }
}

export interface ScheduledStatusLine {
  status: ScheduledStatus;
  /** i18n key under CDSCanvas.ScheduledStatus */
  key: string;
  params: { summary?: string, next?: string };
}

/** The panel status line of the scheduled start point of a webhook (GET). next_runs is omitted on error: no next-run part */
export function scheduledStatusLine(webhook: any, locale?: string): ScheduledStatusLine {
  const sp = findStartPoint(webhook, 'scheduled');
  const status = scheduledStatus(sp, webhook?.scheduled_live);
  const schedule = sp?.schedule;
  const params: { summary?: string, next?: string } = {};
  if (schedule && !scheduleError(schedule)) {
    params.summary = describeSchedule(schedule);
  }
  let key = status as string;
  if (status === 'live') {
    const first = Array.isArray(webhook?.next_runs) ? webhook.next_runs[0] : undefined;
    if (first && schedule?.timezone) {
      params.next = formatNextRun(first, schedule.timezone, locale);
    } else {
      key = 'live_no_next';
    }
  }
  return { status, key, params };
}

/** The time zones of the select: every IANA zone the browser knows (fallback: the browser one and UTC), always with the current one */
export function timezoneList(current?: string, browserTimezone?: string): { name: string, value: string }[] {
  let zones: string[] = [];
  try {
    const supported = (Intl as any).supportedValuesOf;
    zones = typeof supported === 'function' ? supported.call(Intl, 'timeZone') : [];
  } catch (e) {
    zones = [];
  }
  const all = new Set<string>(zones);
  all.add('UTC');
  [browserTimezone, current].forEach(z => { if (z) { all.add(z); } });
  return Array.from(all).sort().map(z => ({ name: z, value: z }));
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}

export interface ScheduledPanelDeps {
  upsert: (body: any) => Observable<any>;
  sync: () => Observable<any>;
  /** reload the webhook after a successful save/sync (the canvas box badge and the panel status) */
  refresh: () => void;
  onError: (err: any) => void;
}

/**
 * The edit state of the Scheduled box panel: the form (enabled, schedule, source name, payload rows), its validation
 * and the debounced save. Invalid input is flagged and never sent; one PUT after the last of several quick edits;
 * a change made while a PUT is in flight is sent once that PUT ends.
 */
export class ScheduledPanelModel {
  enabled = false;
  sourceName = '';
  schedule: Schedule;
  rows: PayloadRow[] = [];
  scheduleErrorText: string | null = null;
  payloadErrorText: string | null = null;
  saving = false;

  private timer: any = null;
  private again = false;
  private idleWaiters: (() => void)[] = [];

  constructor(private readonly deps: ScheduledPanelDeps, private readonly blockId: string, timezone: string) {
    this.schedule = defaultSchedule(timezone);
  }

  /** The form of the draft start point of this block; a box without a start point (imported, redone) starts off with the defaults */
  load(webhook: any, timezone: string) {
    const sp = findStartPoint(webhook, 'scheduled');
    if (sp && sp.block_id === this.blockId && sp.schedule) {
      this.enabled = sp.enabled !== false;
      this.sourceName = sp.mapping?.source_name || '';
      this.schedule = { ...sp.schedule, weekdays: sp.schedule.weekdays ? [...sp.schedule.weekdays] : undefined };
      this.rows = payloadToRows(sp.mapping?.payload);
    } else {
      this.enabled = false;
      this.sourceName = '';
      this.schedule = defaultSchedule(timezone);
      this.rows = [];
    }
    this.validate();
  }

  get hasError(): boolean {
    return !!(this.scheduleErrorText || this.payloadErrorText);
  }

  get repeat(): ScheduledRepeat {
    if (this.schedule.frequency === 'interval') {
      return this.schedule.unit === 'hours' ? 'interval_hours' : 'interval_minutes';
    }
    return this.schedule.frequency;
  }

  /** Switching Repeat keeps the fields the new frequency needs and gives the others a valid default */
  setRepeat(repeat: ScheduledRepeat) {
    const s = this.schedule;
    if (repeat === 'interval_minutes') {
      this.schedule = { frequency: 'interval', every: 15, unit: 'minutes', timezone: s.timezone };
    } else if (repeat === 'interval_hours') {
      this.schedule = { frequency: 'interval', every: 1, unit: 'hours', timezone: s.timezone };
    } else {
      const next: Schedule = { frequency: repeat, time: s.time || '09:00', timezone: s.timezone };
      if (repeat === 'weekly') {
        next.weekdays = s.weekdays && s.weekdays.length ? s.weekdays : ['mon', 'tue', 'wed', 'thu', 'fri'];
      } else if (repeat === 'monthly') {
        next.day_of_month = s.day_of_month || 1;
      }
      // a weekday selection survives a Daily detour (it is never sent while Daily is selected)
      if (s.weekdays && repeat !== 'weekly') {
        next.weekdays = s.weekdays;
      }
      this.schedule = next;
    }
    this.changed();
  }

  setEvery(every: any) {
    this.schedule = { ...this.schedule, every: Number(every) };
    this.changed();
  }

  setTime(time: string) {
    this.schedule = { ...this.schedule, time };
    this.changed();
  }

  setTimezone(timezone: string) {
    if (!timezone) {
      return;
    }
    this.schedule = { ...this.schedule, timezone };
    this.changed();
  }

  setDayOfMonth(day: any) {
    this.schedule = { ...this.schedule, day_of_month: day === 'last' ? 'last' : Number(day) };
    this.changed();
  }

  hasWeekday(day: Weekday): boolean {
    return (this.schedule.weekdays || []).includes(day);
  }

  toggleWeekday(day: Weekday) {
    const current = this.schedule.weekdays || [];
    const weekdays = current.includes(day) ? current.filter(d => d !== day) : WEEKDAYS.filter(d => d === day || current.includes(d));
    this.schedule = { ...this.schedule, weekdays };
    this.changed();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.changed();
  }

  setSourceName(value: string) {
    this.sourceName = value;
    this.changed();
  }

  addRow() {
    this.rows = [...this.rows, { name: '', type: 'text', value: '' }];
    // an empty name is invalid: it is flagged, not saved, until it is typed
    this.changed();
  }

  removeRow(index: number) {
    this.rows = this.rows.filter((_, i) => i !== index);
    this.changed();
  }

  setRowType(index: number, type: PayloadRow['type']) {
    const row = this.rows[index];
    if (!row || row.type === type) {
      return;
    }
    const value = type === 'boolean' ? (row.value === true || row.value === 'true') : (typeof row.value === 'boolean' ? String(row.value) : row.value);
    this.rows = this.rows.map((r, i) => i === index ? { ...r, type, value } : r);
    this.changed();
  }

  /** a row field was edited in place (name or value) */
  rowsEdited() {
    this.changed();
  }

  /** The PUT body of the current form, or null when it is invalid */
  buildBody(): any | null {
    this.validate();
    if (this.hasError) {
      return null;
    }
    return {
      block_id: this.blockId,
      enabled: this.enabled,
      mapping: { source_name: (this.sourceName || '').trim(), payload: rowsToPayload(this.rows).payload },
      schedule: cleanSchedule(this.schedule)
    };
  }

  private validate() {
    this.scheduleErrorText = scheduleError(cleanSchedule(this.schedule));
    this.payloadErrorText = rowsToPayload(this.rows).error;
  }

  /** every edit lands here: invalid -> flagged, nothing pending; valid -> one save 600 ms after the last edit */
  private changed() {
    this.cancelTimer();
    this.validate();
    if (this.hasError) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.save();
    }, SCHEDULED_SAVE_DEBOUNCE_MS);
  }

  private cancelTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private save() {
    if (this.saving) {
      this.again = true;
      return;
    }
    const body = this.buildBody();
    if (!body) {
      return;
    }
    this.saving = true;
    this.deps.upsert(body).subscribe({
      next: () => {
        this.finishSave();
        this.deps.refresh();
      },
      error: (err) => {
        this.again = false;
        this.finishSave(true);
        this.deps.onError(err);
      }
    });
  }

  private finishSave(failed = false) {
    this.saving = false;
    if (this.again && !failed) {
      this.again = false;
      this.save();
      return;
    }
    const waiters = this.idleWaiters;
    this.idleWaiters = [];
    waiters.forEach(w => w());
  }

  /** Drops a pending edit (the start point is being deleted: a late PUT would re-create it) */
  cancelPending() {
    this.cancelTimer();
    this.again = false;
  }

  /** Sends a pending edit right away (the panel is closing) */
  flush() {
    if (this.timer) {
      this.cancelTimer();
      this.save();
    }
  }

  /** Resolves once no edit is pending or in flight: "Test scheduled start" runs the draft the user sees */
  flushAndWait(): Promise<void> {
    this.flush();
    if (!this.saving && !this.timer) {
      return Promise.resolve();
    }
    return new Promise<void>(resolve => this.idleWaiters.push(resolve));
  }

  /** Retry of a failed live sync: sync, then reload so the status line and the box badge refresh */
  retrySync() {
    this.deps.sync().subscribe({
      next: () => this.deps.refresh(),
      error: (err) => this.deps.onError(err)
    });
  }
}
