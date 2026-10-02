import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WebhookService } from './webhook-service.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { IntentService } from './intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

describe('WebhookService', () => {
  let service: WebhookService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const mockLogger = { log: jasmine.createSpy('log') } as unknown as LoggerService;
    LoggerInstance.setInstance(mockLogger);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WebhookService,
        { provide: AppStorageService, useValue: { getItem: () => 'JWT test-token' } },
        { provide: IntentService, useValue: { listOfIntents: [] } }
      ]
    });
    service = TestBed.inject(WebhookService);
    httpMock = TestBed.inject(HttpTestingController);
    service.initialize('https://api.test/', 'project1');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('upsertStartPoint puts the start point body', () => {
    service.upsertStartPoint('bot1', 'webhook', { block_id: 'b1', enabled: true }).subscribe();

    const req = httpMock.expectOne('https://api.test/project1/webhooks/bot1/start_points/webhook');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe('JWT test-token');
    expect(JSON.parse(req.request.body)).toEqual({ block_id: 'b1', enabled: true });
    req.flush({});
  });

  it('upsertStartPoint sends mapping and confirm', () => {
    service.upsertStartPoint('bot1', 'webhook', { block_id: 'b1', mapping: { source_name: 'Grafana' }, confirm: true }).subscribe();

    const req = httpMock.expectOne('https://api.test/project1/webhooks/bot1/start_points/webhook');
    expect(JSON.parse(req.request.body)).toEqual({ block_id: 'b1', mapping: { source_name: 'Grafana' }, confirm: true });
    req.flush({});
  });

  it('deleteStartPoint deletes the start point', () => {
    service.deleteStartPoint('bot1', 'webhook').subscribe();

    const req = httpMock.expectOne('https://api.test/project1/webhooks/bot1/start_points/webhook');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('Authorization')).toBe('JWT test-token');
    req.flush({});
  });

  it('testScheduledStart posts to the scheduled test route', () => {
    service.testScheduledStart('bot1').subscribe(r => expect(r.request_id).toBe('r1'));
    const req = httpMock.expectOne('https://api.test/project1/webhooks/bot1/start_points/scheduled/test');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('JWT test-token');
    req.flush({ request_id: 'r1' });
  });

  it('syncScheduledStart posts to the scheduled sync route', () => {
    service.syncScheduledStart('bot1').subscribe();
    const req = httpMock.expectOne('https://api.test/project1/webhooks/bot1/start_points/scheduled/sync');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('upsertStartPoint accepts scheduled with schedule and payload', () => {
    const body = { block_id: 'b1', schedule: { frequency: 'daily' as const, time: '09:00', timezone: 'Europe/Rome' }, mapping: { payload: {} } };
    service.upsertStartPoint('bot1', 'scheduled', body).subscribe();
    const req = httpMock.expectOne('https://api.test/project1/webhooks/bot1/start_points/scheduled');
    expect(req.request.method).toBe('PUT');
    expect(JSON.parse(req.request.body)).toEqual(body);
    req.flush({});
  });

  it('loadWebhook shares one GET between callers and publishes it on webhook$', () => {
    const seen: any[] = [];
    service.webhook$.subscribe(w => seen.push(w));
    service.loadWebhook('bot1');
    service.loadWebhook('bot1');
    const req = httpMock.expectOne('https://api.test/project1/webhooks/bot1');
    req.flush({ scheduled_available: true });
    expect(seen).toEqual([null, { scheduled_available: true }]);
  });

  it('loadWebhook keeps the previous value when a reload of the same chatbot fails', () => {
    service.loadWebhook('bot1');
    httpMock.expectOne('https://api.test/project1/webhooks/bot1').flush({ scheduled_available: true });
    service.loadWebhook('bot1', true);
    httpMock.expectOne('https://api.test/project1/webhooks/bot1').flush('x', { status: 503, statusText: 'no' });
    expect(service.webhook$.value).toEqual({ scheduled_available: true });
  });

  it('loadWebhook for another chatbot clears the previous value and a failed GET leaves null', () => {
    service.loadWebhook('bot1');
    httpMock.expectOne('https://api.test/project1/webhooks/bot1').flush({ scheduled_available: true });
    service.loadWebhook('bot2');
    expect(service.webhook$.value).toBeNull();
    httpMock.expectOne('https://api.test/project1/webhooks/bot2').flush('x', { status: 503, statusText: 'no' });
    expect(service.webhook$.value).toBeNull();
  });

  it('switching chatbot while A is in flight cancels A and emits only B', () => {
    const seen: any[] = [];
    service.webhook$.subscribe(w => seen.push(w));
    service.loadWebhook('botA');
    const reqA = httpMock.expectOne('https://api.test/project1/webhooks/botA');
    service.loadWebhook('botB');
    expect(reqA.cancelled).toBeTrue();
    httpMock.expectOne('https://api.test/project1/webhooks/botB').flush({ id: 'B' });
    expect(seen).toEqual([null, { id: 'B' }]);
  });
});
