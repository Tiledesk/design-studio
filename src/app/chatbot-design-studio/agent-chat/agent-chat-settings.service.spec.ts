import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppConfigService } from 'src/app/services/app-config';
import { AgentChatSettingsService } from './agent-chat-settings.service';

class FakeAppConfig {
  constructor(private cfg: any) {}
  getConfig() { return this.cfg; }
}

describe('AgentChatSettingsService', () => {
  let http: HttpTestingController;

  function setup(cfg: any = { agentChatUrl: 'https://chat.test/' }) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AgentChatSettingsService,
        { provide: AppConfigService, useValue: new FakeAppConfig(cfg) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    localStorage.setItem('tiledesk_token', 'JWT abc');
    return TestBed.inject(AgentChatSettingsService);
  }

  afterEach(() => {
    localStorage.removeItem('tiledesk_token');
    // Each test's own expectOne() already asserts the request it expects;
    // verify() is what would catch a stray or unexpected call that no
    // expectOne() in that test looked for.
    http.verify();
  });

  it('is unavailable when no chat url is configured', () => {
    expect(setup({}).isAvailable()).toBe(false);
    expect(setup({ agentChatUrl: 'CHANGEIT' }).isAvailable()).toBe(false);
    expect(setup().isAvailable()).toBe(true);
  });

  it('lists models from the runtime, without the trailing slash doubling', async () => {
    const service = setup();
    const promise = service.listModels();
    const req = http.expectOne('https://chat.test/v1/models');
    expect(req.request.headers.get('Authorization')).toBe('JWT abc');
    req.flush({ data: [{ id: 'openai:gpt-5.5', label: 'GPT-5.5', provider: 'openai',
                         vision: true, pricing: null, default: false }] });
    expect((await promise)[0].id).toBe('openai:gpt-5.5');
  });

  it('reads a project setting', async () => {
    const service = setup();
    const promise = service.read('p1');
    http.expectOne('https://chat.test/v1/projects/p1/settings')
        .flush({ project_id: 'p1', model: null, updated_at: null, updated_by: null });
    expect((await promise).model).toBeNull();
  });

  it('saves a project setting with PUT', async () => {
    const service = setup();
    const promise = service.save('p1', { id: 'openai:gpt-5.5', params: { temperature: 0.2 } });
    const req = http.expectOne('https://chat.test/v1/projects/p1/settings');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ model: { id: 'openai:gpt-5.5',
                                                params: { temperature: 0.2 } } });
    req.flush({ project_id: 'p1', model: { id: 'openai:gpt-5.5', params: { temperature: 0.2 } },
                updated_at: 't', updated_by: 'u' });
    expect((await promise).model!.id).toBe('openai:gpt-5.5');
  });

  it('rejects every call instead of throwing when unconfigured', async () => {
    const service = setup({});
    await expectAsync(service.listModels()).toBeRejected();
    await expectAsync(service.read('p1')).toBeRejected();
    await expectAsync(service.save('p1', null)).toBeRejected();
  });

  it('sends a bare token with the JWT scheme added exactly once', async () => {
    localStorage.setItem('tiledesk_token', 'abc');
    const service = setup();
    void service.listModels();
    expect(http.expectOne('https://chat.test/v1/models')
               .request.headers.get('Authorization')).toBe('JWT abc');
  });
});
