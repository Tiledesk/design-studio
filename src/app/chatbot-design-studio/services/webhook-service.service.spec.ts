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

  it('createStartWebhook posts a conversation-mode webhook bound to the start block', () => {
    service.createStartWebhook('bot1', 'start-intent', { department_id: 'dep1', source_name: 'Grafana alerts' }).subscribe();

    const req = httpMock.expectOne('https://api.test/project1/webhooks/');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('JWT test-token');
    expect(JSON.parse(req.request.body)).toEqual({
      chatbot_id: 'bot1', block_id: 'start-intent', mode: 'conversation', department_id: 'dep1', source_name: 'Grafana alerts'
    });
    req.flush({ webhook_id: 'w1' });
  });

  it('updateWebhookSettings puts only the given fields', () => {
    service.updateWebhookSettings('bot1', { enabled: false }).subscribe();

    const req = httpMock.expectOne('https://api.test/project1/webhooks/bot1');
    expect(req.request.method).toBe('PUT');
    expect(JSON.parse(req.request.body)).toEqual({ enabled: false });
    req.flush({ webhook_id: 'w1' });
  });
});
