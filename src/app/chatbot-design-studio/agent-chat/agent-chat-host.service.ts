import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AppConfigService } from 'src/app/services/app-config';
import { DashboardService } from 'src/app/services/dashboard.service';
import { IntentService } from '../services/intent.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
import { FlowOpsService } from './flow-ops.service';
import { FlowOp, FlowOpsReport } from './flow-ops.model';
import { AgentChatConfig, readAgentChatConfig } from './agent-chat.config';
import { loadAgentChatAdapter } from './agent-chat-loader';
import { AgentChatHost, HostConfig } from './agent-chat-adapter.types';
import { AgentChatFamilyService } from './agent-chat-family.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/** `tiledesk_token` in localStorage holds the whole `Authorization` header
 *  value, scheme and all -- see webhook-service.service.ts, which sends it
 *  through unchanged. The chat's own runtime client adds a `JWT ` scheme of
 *  its own, so handing it an already-prefixed value would double it up and
 *  every call would 401. Strip a leading scheme case-insensitively, tolerate
 *  extra whitespace, and leave a bare token untouched -- the prefix is not
 *  guaranteed to be there. */
function stripTokenScheme(token: string): string {
  return token.replace(/^\s*jwt\s+/i, '');
}

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

  private flowSwitchedSource = new Subject<string>();
  /** Emits the newly open flow's id whenever the canvas moves to another flow
   *  of the family -- from `open_flow` or from the Subagents panel, both of
   *  which go through the dashboard's one navigator.
   *
   *  The panel survives that move now, and so does everything it was saying
   *  about the last batch. An Undo offered across a switch is an Undo
   *  FlowOpsService will refuse (the entries describe the flow that is no
   *  longer open), so it must stop being offered. */
  public readonly flowSwitched$ = this.flowSwitchedSource.asObservable();

  private logger: LoggerService = LoggerInstance.getInstance();

  /** How the host moves the canvas. Registered by the dashboard, which owns
   *  the router and the canvas's lifetime; the host knows only that the
   *  promise resolves when the new flow is open and loaded. */
  private flowNavigator: ((faqKbId: string) => Promise<void>) | null = null;

  constructor(
    private appConfigService: AppConfigService,
    private dashboardService: DashboardService,
    private intentService: IntentService,
    private tiledeskAuthService: TiledeskAuthService,
    private flowOps: FlowOpsService,
    private family: AgentChatFamilyService
  ) {
    this.config = readAgentChatConfig(this.appConfigService.getConfig());
    // The chat is handed the token once, at `hello`, and then talks to the
    // runtime by itself; a session that outlives its JWT would just start
    // failing. Pushing a fresh one in beats reloading the frame, which would
    // take the conversation with it.
    this.tiledeskAuthService.tiledeskTokenChanged$
      .subscribe((token: string) => this.setToken(token));
    // Switching chatbot usually destroys the panel, and the re-attach that
    // follows reads both values live -- but that is a property of today's
    // routing, not a guarantee. This makes the context follow the switch
    // whether or not the panel survives it.
    this.dashboardService.selectedChatbot$.subscribe(() => this.setContext());
    // Both are no-ops while nothing is attached. This service is root-scoped
    // and lives as long as the app, so neither subscription outlives anything.
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
    // A second attach() without an intervening detach() -- plausible if a
    // panel remounts without a matching ngOnDestroy -- must not leave the
    // previous host's postMessage listener alive to answer alongside the new
    // one.
    //
    // Destroying before the new load, rather than after it succeeds, cannot
    // lose a working host: the panel sets `attached = true` before calling
    // wire() and clears it only when wire() fails, so the only way back here
    // is after a failure -- and a failed attach() left no host behind.
    this.host?.destroy();
    this.host = null;
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
        token: this.storedToken(),
        projectId: this.dashboardService.projectID,
        flowId: this.family.rootId()
      })
    });

    this.host.registerTool('get_flow', async () => {
      // readFlow() is synchronous and cannot fail; family.read() awaits up to
      // two HTTP calls and can. Losing id_faq_kb and intents -- the flow the
      // agent could always read -- to a transient family lookup failure would
      // make get_flow, the agent's only way to read the flow, less reliable
      // than it was before families existed. A degraded answer without the
      // family is something the agent can still work from; no answer at all
      // is not.
      let family;
      try {
        family = await this.family.read();
      } catch (error) {
        this.logger.error('[AGENT-CHAT-HOST] get_flow: family read failed:', error);
      }
      return { ...this.flowOps.readFlow(), family };
    });

    this.host.registerTool('get_canvas_selection', async () => {
      const selected = this.intentService.intentSelected;
      return { intent_ids: selected ? [selected.intent_id] : [] };
    });

    this.host.registerTool('apply_flow_patch', async (args) => {
      const declared = args?.['faq_kb_id'] as string | undefined;
      const open = this.dashboardService.id_faq_kb;
      // The canvas can now move under a running turn -- the agent opens a
      // subagent, or the user picks a sibling from the panel while the agent
      // is thinking. A refusal is something the agent reads and recovers
      // from; a batch applied to the wrong flow is discovered later, if ever.
      if (!declared || declared !== open) {
        return {
          ok: false,
          rejected_before_applying: true,
          results: [{
            op: '(batch)', ok: false,
            error: declared
              ? `This patch declares faq_kb_id "${declared}" but the open flow is `
                + `"${open}". Read the open flow with get_flow, or open the one you `
                + `meant with open_flow, then retry.`
              : `Every patch must declare the faq_kb_id it edits. The open flow is `
                + `"${open}".`
          }]
        } as FlowOpsReport;
      }
      const report = await this.flowOps.apply((args?.['operations'] ?? []) as FlowOp[]);
      this.appliedSource.next(report);
      return report;
    });

    this.host.registerTool('open_flow', async (args) => {
      const id = String(args?.['faq_kb_id'] ?? '');
      // The agent is a way to build one family, not a way to walk the
      // project: anything outside it is refused before the studio moves.
      //
      // contains() reaches the server, and a rejection here is an Angular
      // HttpErrorResponse whose `message` is boilerplate about a status code.
      // Every other failure on this path is already a sentence the agent can
      // act on; this one is not allowed to be the exception that escapes raw.
      let inFamily: boolean;
      try {
        inFamily = await this.family.contains(id);
      } catch (error) {
        this.logger.error('[AGENT-CHAT-HOST] open_flow: family lookup failed:', error);
        throw new Error(
          `Could not check whether "${id}" is in this family `
          + `(${String(error?.message ?? error)}). Nothing was opened; this is `
          + `usually transient -- retry the call.`);
      }
      if (!inFamily) {
        throw new Error(
          `"${id}" is not in this family. open_flow moves between this agent and `
          + `its subagents only; use get_flow to see them.`);
      }
      if (!this.flowNavigator) {
        throw new Error('Cannot open another flow: the studio registered no navigator.');
      }
      // Awaited: the navigator resolves only once the canvas has been rebuilt
      // on the new flow, so the agent's next get_flow cannot read the old one.
      await this.flowNavigator(id);
      return {
        faq_kb_id: this.dashboardService.id_faq_kb,
        name: (this.dashboardService.selectedChatbot as any)?.name ?? '',
        is_subagent: this.family.isSubagent()
      };
    });

    this.host.registerTool('create_subagent', async (args) => {
      const name = String(args?.['name'] ?? '').trim();
      // Thrown, not returned as a refusal report: the adapter turns a throw
      // into a `handler_error` tool result the agent reads. There is no
      // partial success to describe here.
      if (!name) { throw new Error('A subagent needs a name.'); }
      const created = await this.family.createSubagent(name);
      return { faq_kb_id: created._id, name: created.name };
    });
  }

  /** Registered by CdsDashboardComponent, which owns the router and the
   *  canvas. Kept as a callback rather than an injected Router so the host
   *  never learns how a flow switch is performed -- only when it is done. */
  public setFlowNavigator(fn: (faqKbId: string) => Promise<void>): void {
    this.flowNavigator = fn;
  }

  /** Withdraw the navigator when the dashboard that registered it goes away.
   *  The callback closes over that component's router and change detector;
   *  this service is root-scoped and would otherwise keep calling through a
   *  destroyed component. The mirror of DashboardService.openFlow = null. */
  public clearFlowNavigator(): void {
    this.flowNavigator = null;
  }

  /** Told by the dashboard once the canvas has been pointed at another flow.
   *  See `flowSwitched$`. */
  public notifyFlowSwitched(faqKbId: string): void {
    this.flowSwitchedSource.next(faqKbId);
  }

  /** Switch the chat to another family's session without reloading the frame.
   *
   *  The key is the family root: moving between a parent and its subagents is
   *  the same conversation, and only a move to another family starts a new
   *  one. */
  public setContext(): void {
    this.host?.setContext({
      projectId: this.dashboardService.projectID,
      flowId: this.family.rootId()
    });
  }

  public setToken(token: string): void {
    this.host?.setToken(stripTokenScheme(token));
  }

  public detach(): void {
    this.host?.destroy();
    this.host = null;
  }

  /** The bare token for the chat's own config, stripped of the scheme
   *  design-studio's storage already carries (see stripTokenScheme above). */
  private storedToken(): string | undefined {
    const stored = localStorage.getItem('tiledesk_token');
    return stored ? stripTokenScheme(stored) : undefined;
  }
}
