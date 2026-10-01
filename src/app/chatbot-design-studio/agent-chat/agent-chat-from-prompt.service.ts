import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from 'src/app/services/app-config';
import { readAgentChatConfig } from './agent-chat.config';
import { AGENT_CHAT_CLIENT_TOOLS } from './agent-chat-host.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/** Where the dashboard leaves the description of the agent it has just created.
 *
 *  The two applications are served from the same origin -- `cdsBaseUrl` is a relative path --
 *  and the redirect stays in the same tab, so sessionStorage carries the text across without a
 *  round trip through the server. The key and the shape are agreed with
 *  `app/utils/agent-from-prompt.util.ts` in tiledesk-dashboard: change one without the other and
 *  the note is written and never found. */
export const AGENT_FROM_PROMPT_PENDING_KEY = 'cds-agent-from-prompt';

/** How long a note stays good for.
 *
 *  The handover is a redirect, so the real distance is seconds. This is generous on purpose: it
 *  is not a timeout, it is a guard against a note nobody collected -- the tab closed a moment
 *  after creation -- coming back to life on some later visit and building a flow the user is no
 *  longer expecting. */
const MAX_PENDING_AGE_MS = 10 * 60 * 1000;

export interface PendingAgentPrompt {
  botId: string;
  prompt: string;
  language: string;
  createdAt?: number;
}

export interface StartedRun {
  sessionId: string;
  runId: string;
}

/**
 * Hands the description written in the dashboard to the agent chat, so it builds the flow.
 *
 * The order is the whole trick. `startRun` opens the agent's session on the runtime and posts
 * the prompt BEFORE the chat panel is mounted. The run starts, reaches its first client tool and
 * waits there -- every flow tool is executed by the browser, not by the runtime. When the chat
 * attaches a moment later it finds a run already in progress and joins it, exactly as it does
 * after a page reload, and the blocks appear on the canvas while the user watches.
 *
 * Opening the session cannot create a second conversation: `POST /v1/sessions` is an upsert on
 * project + flow -- one flow is one conversation -- and answers 200 with the existing session.
 */
@Injectable({ providedIn: 'root' })
export class AgentFromPromptService {

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private readonly http: HttpClient,
    private readonly appConfigService: AppConfigService
  ) { }

  /** Without the agent chat nothing would build the flow, so there is nothing to collect. */
  public isAvailable(): boolean {
    return readAgentChatConfig(this.appConfigService.getConfig()) !== null;
  }

  /** The description waiting for this agent, removed as it is read.
   *
   *  Three ways this goes wrong, three checks: a note meant for another agent (the studio can be
   *  reopened on anything), a note too old to still be wanted, and the same note read twice --
   *  which a reload would otherwise do, starting a second build over the first. */
  public takePending(botId: string): PendingAgentPrompt | null {
    let pending: PendingAgentPrompt | null = null;
    try {
      const raw = sessionStorage.getItem(AGENT_FROM_PROMPT_PENDING_KEY);
      if (!raw) { return null; }
      pending = JSON.parse(raw);
    } catch (error) {
      // Unreadable is as good as absent: a note that cannot be parsed will never parse, so it is
      // dropped rather than left to be retried on every agent opened from now on.
      this.clearPending();
      return null;
    }
    if (!pending || !pending.prompt || pending.botId !== botId) { return null; }
    if (this.isStale(pending)) {
      this.logger.log('[AGENT-FROM-PROMPT] a stale prompt was discarded ', pending.createdAt);
      this.clearPending();
      return null;
    }
    this.clearPending();
    return pending;
  }

  public clearPending(): void {
    try {
      sessionStorage.removeItem(AGENT_FROM_PROMPT_PENDING_KEY);
    } catch (error) {
      this.logger.error('[AGENT-FROM-PROMPT] the pending prompt could not be removed ', error);
    }
  }

  /** Opens the agent's session -- the same upsert the chat does -- and posts the prompt. */
  public async startRun(projectId: string, pending: PendingAgentPrompt): Promise<StartedRun> {
    const base = this.base();
    const headers = this.headers();
    const session: any = await firstValueFrom(this.http.post(`${base}/v1/sessions`, {
      project_id: projectId,
      flow_id: pending.botId,
      client_tools: AGENT_CHAT_CLIENT_TOOLS
    }, { headers }));
    const sessionId = session?.id;
    if (!sessionId) {
      throw new Error('The agent runtime did not return a session.');
    }
    const run: any = await firstValueFrom(this.http.post(
      `${base}/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
      { content: this.messageFor(pending) },
      { headers }));
    this.logger.log('[AGENT-FROM-PROMPT] run started ', { sessionId, runId: run?.run_id });
    return { sessionId, runId: run?.run_id };
  }

  /** What the chat shows as the user's first message.
   *
   *  It describes the agent as it actually is, and that matters: the agent is created from the
   *  server's `blank` template, so it is NOT empty. It already has `start` wired to a `welcome`
   *  block holding a message, and a `defaultFallback` that holds one too -- which rule V3-S3
   *  forbids. Told the flow was empty, the chat would build a second opening beside the one
   *  already there and leave the fallback breaking a rule it is asked to enforce. */
  public messageFor(pending: PendingAgentPrompt): string {
    return `Build this new agent from the request below.\n\n` +
      `The flow is the one a new agent starts with: \`start\` is connected to a \`welcome\` block ` +
      `that holds one message, and \`defaultFallback\` holds a message too. Read it with ` +
      `get_flow first, then:\n` +
      `- reuse \`welcome\` as the first block of the flow, rewriting its message;\n` +
      `- empty \`defaultFallback\` (rule V3-S3) and connect it to a block holding the fallback message;\n` +
      `- write every message the agent sends in "${pending.language}".\n\n` +
      `Request:\n${(pending.prompt || '').trim()}`;
  }

  private isStale(pending: PendingAgentPrompt): boolean {
    // A note without a date comes from a version that did not write one: it is not evidence of
    // age, so it is honoured rather than thrown away.
    if (typeof pending.createdAt !== 'number') { return false; }
    return (Date.now() - pending.createdAt) > MAX_PENDING_AGE_MS;
  }

  private base(): string {
    const config = readAgentChatConfig(this.appConfigService.getConfig());
    if (!config) {
      throw new Error('the agent chat is not configured for this deployment');
    }
    return config.chatUrl;
  }

  /** Same normalisation as AgentChatSettingsService: the stored token may already carry the scheme. */
  private headers(): HttpHeaders {
    const stored = localStorage.getItem('tiledesk_token') || '';
    const bare = stored.replace(/^\s*jwt\s+/i, '');
    return new HttpHeaders({ Authorization: `JWT ${bare}` });
  }
}
