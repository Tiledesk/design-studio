import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { IntentService } from '../services/intent.service';
import { FlowOpsService } from './flow-ops.service';
import { FlowOp, FlowOpsReport } from './flow-ops.model';
import { AgentChatConfig, readAgentChatConfig } from './agent-chat.config';
import { loadAgentChatAdapter } from './agent-chat-loader';
import { AgentChatHost, HostConfig } from './agent-chat-adapter.types';

/** Owns the chat iframe's host side.
 *
 *  Design-studio knows one address. The iframe's src, the postMessage target
 *  and the runtime base URL the chat is handed all derive from it, so they
 *  cannot disagree -- and a disagreement here is the failure this protocol
 *  punishes hardest, since a mismatched origin drops every message in both
 *  directions without throwing or logging anything. */
@Injectable({ providedIn: 'root' })
export class AgentChatHostService {

  private config: AgentChatConfig | null;
  private host: AgentChatHost | null = null;

  /** Set when attach() fails, so the panel can say what went wrong. */
  public lastError: string | null = null;

  private appliedSource = new Subject<FlowOpsReport>();
  /** Emits after every apply_flow_patch, for the panel's summary row. */
  public readonly applied$ = this.appliedSource.asObservable();

  constructor(
    private appConfigService: AppConfigService,
    private dashboardService: DashboardService,
    private intentService: IntentService,
    private flowOps: FlowOpsService
  ) {
    this.config = readAgentChatConfig(this.appConfigService.getConfig());
  }

  public isConfigured(): boolean {
    return this.config !== null;
  }

  public iframeSrc(): string {
    return `${this.config.chatUrl}/?hostOrigin=${encodeURIComponent(location.origin)}`;
  }

  /** Wire the host to an iframe. The caller sets the iframe's src only AFTER
   *  this resolves: the chat sends `ready` the moment it loads, and a src set
   *  first can beat the listener into existence. */
  public async attach(iframe: HTMLIFrameElement): Promise<void> {
    this.lastError = null;
    let adapter;
    try {
      adapter = await loadAgentChatAdapter(this.config.chatUrl);
    } catch (err) {
      this.lastError = String(err?.message ?? err);
      throw err;
    }

    this.host = adapter.createAgentChatHost({
      iframe,
      chatOrigin: this.config.chatOrigin,
      getConfig: (): HostConfig => ({
        // The chat's own mount point: it proxies /v1/ to the runtime, which is
        // why design-studio never learns the runtime's address.
        baseUrl: this.config.chatUrl,
        token: localStorage.getItem('tiledesk_token') ?? undefined,
        projectId: this.dashboardService.projectID,
        flowId: this.dashboardService.id_faq_kb
      })
    });

    this.host.registerTool('get_flow', async () => this.flowOps.readFlow());

    this.host.registerTool('get_canvas_selection', async () => {
      const selected = this.intentService.intentSelected;
      return { intent_ids: selected ? [selected.intent_id] : [] };
    });

    this.host.registerTool('apply_flow_patch', async (args) => {
      const report = await this.flowOps.apply((args?.['operations'] ?? []) as FlowOp[]);
      this.appliedSource.next(report);
      return report;
    });
  }

  /** Switch the chat to another flow's session without reloading the frame. */
  public setContext(): void {
    this.host?.setContext({
      projectId: this.dashboardService.projectID,
      flowId: this.dashboardService.id_faq_kb
    });
  }

  public setToken(token: string): void {
    this.host?.setToken(token);
  }

  public detach(): void {
    this.host?.destroy();
    this.host = null;
  }
}
