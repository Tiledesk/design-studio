import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppConfigService } from 'src/app/services/app-config';
import {
  AgentFromPromptService,
  AGENT_FROM_PROMPT_PENDING_KEY
} from './agent-chat-from-prompt.service';
import { AGENT_CHAT_CLIENT_TOOLS } from './agent-chat-host.service';

describe('AgentFromPromptService', () => {
  let http: HttpTestingController;
  let service: AgentFromPromptService;

  /** Writes a note exactly as the dashboard does. */
  function leaveNote(note: any): void {
    sessionStorage.setItem(AGENT_FROM_PROMPT_PENDING_KEY, JSON.stringify(note));
  }

  function setup(cfg: any = { agentChatUrl: 'https://chat.test/' }) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AgentFromPromptService,
        { provide: AppConfigService, useValue: { getConfig: () => cfg } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    localStorage.setItem('tiledesk_token', 'JWT abc');
    service = TestBed.inject(AgentFromPromptService);
  }

  beforeEach(() => setup());

  afterEach(() => {
    localStorage.removeItem('tiledesk_token');
    sessionStorage.removeItem(AGENT_FROM_PROMPT_PENDING_KEY);
    http.verify();
  });

  it('is available only when the agent chat is configured', () => {
    expect(service.isAvailable()).toBe(true);
    setup({ agentChatUrl: 'CHANGEIT' });
    expect(service.isAvailable()).toBe(false);
  });

  it('hands the note out once, and only to its own agent', () => {
    leaveNote({ botId: 'bot1', prompt: 'Help with orders', language: 'it', createdAt: Date.now() });
    expect(service.takePending('other')).toBeNull();
    expect(service.takePending('bot1').prompt).toBe('Help with orders');
    // A reload must not start the build a second time over the first.
    expect(service.takePending('bot1')).toBeNull();
  });

  it('leaves a note addressed to another agent where it is', () => {
    leaveNote({ botId: 'bot1', prompt: 'x', language: 'it', createdAt: Date.now() });
    expect(service.takePending('bot2')).toBeNull();
    expect(sessionStorage.getItem(AGENT_FROM_PROMPT_PENDING_KEY)).toBeTruthy();
  });

  // A tab closed right after creation leaves a note nobody collected: it must not build a flow
  // on some later visit, when the user is no longer expecting one.
  it('discards a note that is too old, and clears it', () => {
    leaveNote({ botId: 'bot1', prompt: 'x', language: 'it', createdAt: Date.now() - 11 * 60 * 1000 });
    expect(service.takePending('bot1')).toBeNull();
    expect(sessionStorage.getItem(AGENT_FROM_PROMPT_PENDING_KEY)).toBeNull();
  });

  it('honours a note without a date, and drops one it cannot read', () => {
    leaveNote({ botId: 'bot1', prompt: 'x', language: 'it' });
    expect(service.takePending('bot1')).toBeTruthy();

    sessionStorage.setItem(AGENT_FROM_PROMPT_PENDING_KEY, 'not json');
    expect(service.takePending('bot1')).toBeNull();
    expect(sessionStorage.getItem(AGENT_FROM_PROMPT_PENDING_KEY)).toBeNull();
  });

  // The chat joins this session when it mounts: same flow, same declared tools.
  it('opens the agent session with the chat tools and posts the prompt', fakeAsync(() => {
    let started: any;
    service.startRun('proj1', { botId: 'bot1', prompt: 'Help with orders', language: 'it' })
      .then(r => started = r);

    const session = http.expectOne('https://chat.test/v1/sessions');
    expect(session.request.method).toBe('POST');
    expect(session.request.headers.get('Authorization')).toBe('JWT abc');
    expect(session.request.body).toEqual({
      project_id: 'proj1', flow_id: 'bot1', client_tools: AGENT_CHAT_CLIENT_TOOLS
    });
    session.flush({ id: 'sess1' });
    flushMicrotasks();

    const message = http.expectOne('https://chat.test/v1/sessions/sess1/messages');
    expect(message.request.method).toBe('POST');
    expect(message.request.body.content).toContain('Help with orders');
    message.flush({ run_id: 'run1' }, { status: 202, statusText: 'Accepted' });
    flushMicrotasks();

    expect(started).toEqual({ sessionId: 'sess1', runId: 'run1' });
  }));

  it('reports a runtime refusal instead of sending the prompt', fakeAsync(() => {
    let failure: any;
    service.startRun('proj1', { botId: 'bot1', prompt: 'x', language: 'en' })
      .catch(e => failure = e);
    http.expectOne('https://chat.test/v1/sessions')
      .flush({ error: { code: 'unauthorized' } }, { status: 401, statusText: 'Unauthorized' });
    flushMicrotasks();
    expect(failure).toBeTruthy();
    http.expectNone('https://chat.test/v1/sessions/sess1/messages');
  }));

  // The agent is created from the server's `blank` template, so it is NOT empty. Told otherwise,
  // the chat builds a second opening beside the one already there and leaves defaultFallback
  // holding a message, which rule V3-S3 forbids.
  it('describes the flow the agent really starts with, and the language', () => {
    const message = service.messageFor({ botId: 'bot1', prompt: 'Help with orders', language: 'it' });
    expect(message).toContain('welcome');
    expect(message).toContain('defaultFallback');
    expect(message).toContain('V3-S3');
    expect(message).toContain('"it"');
    expect(message).toContain('Help with orders');
    expect(message).not.toContain('The flow is empty');
  });
});
