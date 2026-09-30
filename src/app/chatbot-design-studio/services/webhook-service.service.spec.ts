import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WebhookService } from './webhook-service.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { IntentService } from './intent.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { ReadOnlyService } from 'src/app/services/read-only.service';

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

  it('start point mutations are skipped in read-only mode', () => {
    TestBed.inject(ReadOnlyService).enable();
    let upserted: any = 'unset';
    let deleted: any = 'unset';
    service.upsertStartPoint('bot1', 'webhook', { block_id: 'b1', enabled: true }).subscribe(r => upserted = r);
    service.deleteStartPoint('bot1', 'webhook').subscribe(r => deleted = r);

    httpMock.expectNone('https://api.test/project1/webhooks/bot1/start_points/webhook');
    expect(upserted).toBeNull();
    expect(deleted).toBeNull();
  });
});
